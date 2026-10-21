//! The precompute view's state, testable without a window. While **Precompute matrices…** or
//! **Precompute guess counts…** runs, and after it ends until the player goes back to the game, the
//! window shows this view in place of the board (`ui/precompute_view.rs` draws it): an overall bar
//! with the rate and the time left, a line per item (a matrix, or a Strategy's Guess Count Matrix)
//! with its rows and whether it is waiting, running or finished, and a log.
//!
//! The library reports what happens as events (`matrix::Event`, `guess_count_matrix::Event`); the app
//! applies them here, with the time since the run started. The log keeps the last `MAX_LOG_LINES`
//! lines (a full Guess Count run writes one per Opener, 2 × (2 × 2,315 + 2 × 14,855)) and counts the ones it dropped.

use std::collections::VecDeque;
use std::io;
use std::path::PathBuf;
use std::time::Duration;

use wordle_gpui::solver::guess_count_matrix::{self, BuildError, Built};
use wordle_gpui::solver::matrix::{self, ANSWERS_FILE, GUESSES_FILE};
use wordle_gpui::solver::strategy::{STRATEGIES, Strategy};

use super::guess_counts::{duration_label, end_note, with_commas};
use super::precompute::threads_label;

/// How many log lines are kept; older ones are dropped (and counted).
pub const MAX_LOG_LINES: usize = 1_000;

pub const MATRICES_FOLDER: &str = "precompute-cache/feedback/";
pub const GUESS_COUNTS_FOLDER: &str = "precompute-cache/guess-counts/";

/// Which precompute is running.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Kind {
    /// The two Feedback matrices.
    Matrices,
    /// The Guess Count Matrices of the chosen Strategies.
    GuessCounts,
}

/// Where an item (a matrix, or a Strategy's pass) has got.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Phase {
    Waiting,
    Running,
    Finished,
    /// The run was stopped during this item; its finished rows are kept.
    Stopped,
    /// The run ended (stopped or failed) before this item started.
    NotStarted,
    Failed,
}

impl Phase {
    pub fn label(self) -> &'static str {
        match self {
            Phase::Waiting => "waiting",
            Phase::Running => "running",
            Phase::Finished => "finished",
            Phase::Stopped => "stopped",
            Phase::NotStarted => "not started",
            Phase::Failed => "failed",
        }
    }
}

/// One line of the progress: a matrix or a Strategy.
#[derive(Clone, Debug, PartialEq)]
pub struct Item {
    /// The file name or the Strategy id.
    pub id: String,
    /// What it is: the matrix's shape or the Strategy's name.
    pub detail: String,
    /// Rows done (finished before the run included), out of `total`.
    pub done: usize,
    pub total: usize,
    pub phase: Phase,
    /// Rows finished before this item's pass started.
    base: usize,
}

/// What a log line is about, which picks its colour.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Tone {
    Info,
    /// A finished row: the most common line, drawn dimmer.
    Row,
    Success,
    Warning,
    Error,
}

/// A part of a log line drawn in a colour of its own, over the colour of its `Tone`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Span {
    /// A Strategy id, such as `bits-answers-candidates`.
    Strategy,
    /// The Opener after a Strategy id, such as `salet` in `bits-guesses-candidates salet:`.
    Opener,
    /// A number: a count (`14,855`), an average (`3.528`) or a size (`34.4`).
    Number,
    /// A file name or a folder (`guesses_vs_answers.npy`, `precompute-cache/feedback/`).
    Path,
}

/// The byte ranges of `text` to colour, in order. Words are split on spaces; punctuation around a
/// word (`:`, `,`, `(`, `)`) keeps the line's own colour.
pub fn highlights(text: &str) -> Vec<(std::ops::Range<usize>, Span)> {
    let mut spans = Vec::new();
    let mut after_strategy = false;
    let mut start = 0;
    for word in text.split(' ') {
        let end = start + word.len();
        let core = word.trim_start_matches('(').trim_end_matches([':', ',', ';', ')']);
        let from = start + (word.len() - word.trim_start_matches('(').len());
        let span = if STRATEGIES.iter().any(|strategy| strategy.id == core) {
            Some(Span::Strategy)
        } else if after_strategy && core.len() == 5 && core.bytes().all(|byte| byte.is_ascii_lowercase()) {
            Some(Span::Opener)
        } else if core.ends_with(".npy") || core.ends_with(".json") || core.contains('/') {
            Some(Span::Path)
        } else if core.starts_with(|c: char| c.is_ascii_digit()) && core.chars().all(|c| c.is_ascii_digit() || c == ',' || c == '.') {
            Some(Span::Number)
        } else {
            None
        };
        if let Some(span) = span {
            spans.push((from..from + core.len(), span));
        }
        after_strategy = span == Some(Span::Strategy);
        start = end + 1;
    }
    spans
}

#[derive(Clone, Debug, PartialEq)]
pub struct LogLine {
    /// Since the run started.
    pub at: Duration,
    pub tone: Tone,
    pub text: String,
}

/// How a run ended.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum End {
    Finished,
    Stopped,
    Failed,
}

/// What a key press asks while the view shows.
#[derive(Debug, PartialEq)]
pub enum Outcome {
    /// Leave the view: the game shows again, as it was.
    BackToGame,
    None,
}

pub struct RunState {
    pub kind: Kind,
    pub threads: usize,
    pub items: Vec<Item>,
    log: VecDeque<LogLine>,
    /// Log lines dropped to keep `MAX_LOG_LINES`.
    dropped: usize,
    pub stop_asked: bool,
    /// How it ended, and when.
    pub end: Option<(End, Duration)>,
    /// When the item going on started, and the rows done overall then: the rate is measured from it.
    pass: Option<(Duration, usize)>,
}

impl RunState {
    /// A Precompute matrices run on `threads` threads: `guess_rows` × `answer_rows`, then
    /// `answer_rows` × `answer_rows`.
    pub fn matrices(threads: usize, guess_rows: usize, answer_rows: usize) -> Self {
        let item = |file: &str, what: &str, rows: usize| Item {
            id: file.into(),
            detail: format!("{what}, {} × {}", with_commas(rows), with_commas(answer_rows)),
            done: 0,
            total: rows,
            phase: Phase::Waiting,
            base: 0,
        };
        let items = vec![item(GUESSES_FILE, "Guess List × Answer List", guess_rows), item(ANSWERS_FILE, "Answer List × Answer List", answer_rows)];
        let mut state = Self::new(Kind::Matrices, threads, items);
        state.push(Duration::ZERO, Tone::Info, format!("Precompute matrices on {} into {MATRICES_FOLDER}", threads_label(threads)));
        state
    }

    /// A Precompute guess counts run of `strategies` on `threads` threads, one row per word of each
    /// Strategy's Guess Pool.
    pub fn guess_counts(threads: usize, strategies: &[&'static Strategy]) -> Self {
        let item = |strategy: &&'static Strategy| Item { id: strategy.id.into(), detail: strategy.name.into(), done: 0, total: strategy.set.size(), phase: Phase::Waiting, base: 0 };
        let items = strategies.iter().map(item).collect();
        let mut state = Self::new(Kind::GuessCounts, threads, items);
        let ids: Vec<&str> = strategies.iter().map(|strategy| strategy.id).collect();
        state.push(Duration::ZERO, Tone::Info, format!("Precompute guess counts on {} into {GUESS_COUNTS_FOLDER}: {}", threads_label(threads), ids.join(", ")));
        state.push(Duration::ZERO, Tone::Info, "Reading the Feedback matrices and the rows already done".into());
        state
    }

    fn new(kind: Kind, threads: usize, items: Vec<Item>) -> Self {
        Self { kind, threads, items, log: VecDeque::new(), dropped: 0, stop_asked: false, end: None, pass: None }
    }

    pub fn title(&self) -> &'static str {
        match self.kind {
            Kind::Matrices => "Precompute matrices",
            Kind::GuessCounts => "Precompute guess counts",
        }
    }

    pub fn is_running(&self) -> bool {
        self.end.is_none()
    }

    /// Only a Guess Count run can be stopped (the matrices take about a second).
    pub fn can_stop(&self) -> bool {
        self.kind == Kind::GuessCounts && self.is_running() && !self.stop_asked
    }

    /// The log, oldest first.
    pub fn log(&self) -> &VecDeque<LogLine> {
        &self.log
    }

    /// How many older log lines were dropped.
    pub fn dropped(&self) -> usize {
        self.dropped
    }

    fn push(&mut self, at: Duration, tone: Tone, text: String) {
        if self.log.len() == MAX_LOG_LINES {
            self.log.pop_front();
            self.dropped += 1;
        }
        self.log.push_back(LogLine { at, tone, text });
    }

    fn item(&mut self, id: &str) -> Option<&mut Item> {
        self.items.iter_mut().find(|item| item.id == id)
    }

    /// Rows done across every item, those finished before the run included.
    pub fn done(&self) -> usize {
        self.items.iter().map(|item| item.done).sum()
    }

    pub fn total(&self) -> usize {
        self.items.iter().map(|item| item.total).sum()
    }

    /// Done over total, 0 to 1.
    pub fn fraction(&self) -> f32 {
        if self.total() == 0 { 0.0 } else { self.done() as f32 / self.total() as f32 }
    }

    /// Time since the run started, frozen when it ended.
    pub fn elapsed(&self, now: Duration) -> Duration {
        self.end.map_or(now, |(_, at)| at)
    }

    /// Rows per second over the item going on (or the last one), if any rows are done in it.
    pub fn rate(&self, now: Duration) -> Option<f64> {
        let (started, done_then) = self.pass?;
        let seconds = self.elapsed(now).saturating_sub(started).as_secs_f64();
        let rows = self.done().saturating_sub(done_then);
        (rows > 0 && seconds > 0.0).then(|| rows as f64 / seconds)
    }

    /// The rows still to do across every item at the current rate, while the run goes on.
    pub fn time_left(&self, now: Duration) -> Option<Duration> {
        if !self.is_running() {
            return None;
        }
        let rate = self.rate(now)?;
        Some(Duration::from_secs_f64((self.total() - self.done()) as f64 / rate))
    }

    /// The line beside the overall bar: "1,234 of 59,420 rows · 12.5 rows/s · about 18 min left",
    /// or once it has ended, "59,420 of 59,420 rows · 31 min 20s".
    pub fn progress_line(&self, now: Duration) -> String {
        let mut parts = vec![format!("{} of {} rows", with_commas(self.done()), with_commas(self.total()))];
        if self.is_running() {
            if let Some(rate) = self.rate(now) {
                parts.push(rate_label(rate));
            }
            if let Some(left) = self.time_left(now) {
                parts.push(time_left_label(left));
            }
        } else {
            parts.push(duration_label(self.elapsed(now)));
        }
        parts.join(" · ")
    }

    fn start_pass(&mut self, at: Duration) {
        self.pass = Some((at, self.done()));
    }

    /// Apply what the Guess Count Matrix build reported, `at` since the run started.
    pub fn apply_guess_counts(&mut self, event: guess_count_matrix::Event, at: Duration) {
        use guess_count_matrix::Event;
        match event {
            Event::Planned { strategy, finished, to_fill } => {
                if let Some(item) = self.item(strategy.id) {
                    item.done = finished;
                    item.base = finished;
                    item.total = finished + to_fill;
                }
            }
            Event::PassStarted { strategy, finished, to_fill } => {
                if let Some(item) = self.item(strategy.id) {
                    item.done = finished;
                    item.base = finished;
                    item.total = finished + to_fill;
                    item.phase = Phase::Running;
                }
                self.start_pass(at);
                let to_fill = if to_fill == 0 { "nothing to fill".to_string() } else { format!("{} to fill", with_commas(to_fill)) };
                self.push(at, Tone::Info, format!("{} started: {} rows already done, {to_fill}", strategy.id, with_commas(finished)));
            }
            Event::RowDone { strategy, word, done, average_guess_count, losses, .. } => {
                if let Some(item) = self.item(strategy.id) {
                    // Threads report out of order: keep the furthest.
                    item.done = item.done.max(item.base + done);
                }
                self.push(at, Tone::Row, format!("{} {word}: {average_guess_count:.3} Guesses on average, {}", strategy.id, losses_label(losses)));
            }
            Event::Flushed { strategy, done } => {
                self.push(at, Tone::Info, format!("Saved the finished rows to disk ({}: {} this pass)", strategy.id, with_commas(done)));
            }
            Event::PassEnded { strategy, filled, stopped } => {
                if let Some(item) = self.item(strategy.id) {
                    item.phase = if stopped { Phase::Stopped } else { Phase::Finished };
                }
                if stopped {
                    self.push(at, Tone::Warning, format!("{} stopped: {} rows filled and kept", strategy.id, with_commas(filled)));
                } else {
                    self.push(at, Tone::Success, format!("{} finished: {} rows filled", strategy.id, with_commas(filled)));
                }
            }
        }
    }

    /// Apply what the Feedback matrices build reported, `at` since the run started.
    pub fn apply_matrix(&mut self, event: matrix::Event, at: Duration) {
        use matrix::Event;
        match event {
            Event::Started { file, rows, columns } => {
                if let Some(item) = self.item(file) {
                    item.phase = Phase::Running;
                    item.total = rows;
                }
                self.start_pass(at);
                let how = if file == ANSWERS_FILE { "copying the Answers' rows of the Guess matrix" } else { "scoring every pair" };
                self.push(at, Tone::Info, format!("{file} started: {} × {}, {how}", with_commas(rows), with_commas(columns)));
            }
            Event::Rows { file, done, .. } => {
                if let Some(item) = self.item(file) {
                    item.done = item.done.max(done);
                }
            }
            Event::Saved { file, path, rows, columns, bytes } => {
                if let Some(item) = self.item(file) {
                    item.done = item.total;
                    item.phase = Phase::Finished;
                }
                self.push(at, Tone::Success, format!("Saved {file}: {} × {}, {} ({})", with_commas(rows), with_commas(columns), megabytes(bytes), path.display()));
            }
        }
    }

    /// The player asked to stop: each thread drops the Opener it is playing.
    pub fn ask_stop(&mut self, at: Duration) {
        self.stop_asked = true;
        self.push(at, Tone::Warning, "Stop asked for: each thread drops the Opener it is playing; finished rows are kept".into());
    }

    fn end_with(&mut self, end: End, at: Duration, tone: Tone, text: String) {
        for item in &mut self.items {
            item.phase = match (item.phase, end) {
                (Phase::Waiting, End::Finished) => Phase::Finished,
                (Phase::Waiting, _) => Phase::NotStarted,
                (Phase::Running, End::Stopped) => Phase::Stopped,
                (Phase::Running, End::Failed) => Phase::Failed,
                (Phase::Running, End::Finished) => Phase::Finished,
                (phase, _) => phase,
            };
        }
        self.end = Some((end, at));
        self.push(at, tone, text);
    }

    /// The Guess Count run ended `at` since it started.
    pub fn finish_guess_counts(&mut self, result: &Result<Built, BuildError>, at: Duration) {
        let text = end_note(result, at, self.threads);
        match result {
            Ok(built) if built.stopped => self.end_with(End::Stopped, at, Tone::Warning, text),
            Ok(_) => self.end_with(End::Finished, at, Tone::Success, text),
            Err(_) => self.end_with(End::Failed, at, Tone::Error, text),
        }
    }

    /// The matrices run ended `at` since it started.
    pub fn finish_matrices(&mut self, result: &io::Result<(PathBuf, PathBuf)>, at: Duration) {
        match result {
            Ok(_) => {
                let text = format!("Saved the matrices to {MATRICES_FOLDER} in {} ({})", duration_label(at), threads_label(self.threads));
                self.end_with(End::Finished, at, Tone::Success, text)
            }
            Err(error) => self.end_with(End::Failed, at, Tone::Error, format!("Couldn't save the matrices: {error}")),
        }
    }

    /// Enter or Escape go back to the game once the run has ended; while it runs, keys do nothing
    /// (and never reach the hidden board).
    pub fn press(&self, key: &str) -> Outcome {
        match key {
            "enter" | "escape" if !self.is_running() => Outcome::BackToGame,
            _ => Outcome::None,
        }
    }
}

/// What fills the middle of the window.
#[derive(Debug, PartialEq)]
pub enum Area {
    /// A precompute run, going on or ended, until the player goes back to the game.
    Precompute,
    /// Solver mode's board, whose Feedback is clicked in by hand.
    SolverMode,
    Game,
}

/// The precompute view, while a run is shown (`run_shown`), hides the board without touching it: the Game and
/// Solver mode's State stay as they were, and show again when the run is closed.
pub fn main_area(run_shown: bool, solver_mode: bool) -> Area {
    match (run_shown, solver_mode) {
        (true, _) => Area::Precompute,
        (false, true) => Area::SolverMode,
        (false, false) => Area::Game,
    }
}

/// A log line's time since the run started: "00:02:05".
pub fn clock(at: Duration) -> String {
    let seconds = at.as_secs();
    format!("{:02}:{:02}:{:02}", seconds / 3600, seconds / 60 % 60, seconds % 60)
}

fn losses_label(losses: usize) -> String {
    match losses {
        0 => "no Losses".into(),
        1 => "1 Loss".into(),
        n => format!("{} Losses", with_commas(n)),
    }
}

fn rate_label(rows_per_second: f64) -> String {
    if rows_per_second < 100.0 { format!("{rows_per_second:.1} rows/s") } else { format!("{} rows/s", with_commas(rows_per_second.round() as usize)) }
}

/// "under a minute left", "about 12 min left", "about 4 h 05 min left".
pub fn time_left_label(left: Duration) -> String {
    match left.as_secs() {
        0..60 => "under a minute left".to_string(),
        seconds @ 60..5400 => format!("about {} min left", (seconds + 30) / 60),
        seconds => format!("about {} h {:02} min left", seconds / 3600, seconds / 60 % 60),
    }
}

/// Bytes as decimal megabytes: "34.4 MB".
fn megabytes(bytes: usize) -> String {
    format!("{:.1} MB", bytes as f64 / 1e6)
}

#[cfg(test)]
#[path = "precompute_run_tests.rs"]
mod tests;
