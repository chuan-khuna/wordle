//! The "Precompute guess counts…" picker's state, testable without a window: the thread count (as
//! for Precompute matrices) and which Strategies to compute, all on by default. Up and Down move
//! between the Strategies, Space turns the highlighted one on or off, Left and Right (or typing 1, 2,
//! 4 or 8) change the thread count, Enter runs, Escape goes back. Also the words the status bar
//! shows while a run goes on and when it ends.

use std::time::Duration;

use wordle_gpui::solver::guess_count_matrix::{BuildError, Built, Progress};
use wordle_gpui::solver::matrix::THREAD_CHOICES;
use wordle_gpui::solver::strategy::{STRATEGIES, Strategy};

use super::precompute::{ThreadPicker, threads_label};

pub struct GuessCountPicker {
    pub threads: ThreadPicker,
    /// Whether each of `STRATEGIES` is to be computed.
    pub chosen: [bool; STRATEGIES.len()],
    /// Which of `STRATEGIES` is highlighted.
    pub cursor: usize,
}

/// What a key press in the picker asks the app to do.
#[derive(Debug, PartialEq)]
pub enum Outcome {
    /// Close the picker and fill these Strategies' matrices on this many threads.
    Run { threads: usize, strategies: Vec<&'static Strategy> },
    Cancel,
    /// Nothing to change, apart from the picker itself.
    None,
}

impl Default for GuessCountPicker {
    fn default() -> Self {
        Self { threads: ThreadPicker::default(), chosen: [true; STRATEGIES.len()], cursor: 0 }
    }
}

impl GuessCountPicker {
    pub fn strategies(&self) -> Vec<&'static Strategy> {
        STRATEGIES.iter().zip(self.chosen).filter_map(|(strategy, chosen)| chosen.then_some(strategy)).collect()
    }

    /// Run with what is chosen, unless no Strategy is.
    pub fn run(&self) -> Outcome {
        let strategies = self.strategies();
        if strategies.is_empty() { Outcome::None } else { Outcome::Run { threads: self.threads.threads(), strategies } }
    }

    pub fn toggle(&mut self, index: usize) {
        self.chosen[index] = !self.chosen[index];
        self.cursor = index;
    }

    /// `key` is gpui's name for the key ("up", "space", "4").
    pub fn press(&mut self, key: &str) -> Outcome {
        let count = STRATEGIES.len();
        let thread_choices = THREAD_CHOICES.len();
        match key {
            "escape" => return Outcome::Cancel,
            "enter" => return self.run(),
            "down" => self.cursor = (self.cursor + 1) % count,
            "up" => self.cursor = (self.cursor + count - 1) % count,
            "space" => self.toggle(self.cursor),
            "right" => self.threads.selected = (self.threads.selected + 1) % thread_choices,
            "left" => self.threads.selected = (self.threads.selected + thread_choices - 1) % thread_choices,
            _ => {
                self.threads.press(key);
            }
        }
        Outcome::None
    }
}

/// What a key press asks while the app offers to stop a run.
#[derive(Debug, PartialEq)]
pub enum StopOutcome {
    Stop,
    KeepGoing,
    None,
}

/// Enter stops the run, Escape lets it go on.
pub fn stop_key(key: &str) -> StopOutcome {
    match key {
        "enter" => StopOutcome::Stop,
        "escape" => StopOutcome::KeepGoing,
        _ => StopOutcome::None,
    }
}

/// `1234567` as "1,234,567".
pub fn with_commas(number: usize) -> String {
    let digits = number.to_string();
    let mut grouped = String::new();
    for (index, digit) in digits.chars().enumerate() {
        if index > 0 && (digits.len() - index) % 3 == 0 {
            grouped.push(',');
        }
        grouped.push(digit);
    }
    grouped
}

/// A duration as "42.0s", "3 min 05s" or "2 h 07 min".
pub fn duration_label(time: Duration) -> String {
    let seconds = time.as_secs();
    match seconds {
        0..60 => format!("{:.1}s", time.as_secs_f32()),
        60..3600 => format!("{} min {:02}s", seconds / 60, seconds % 60),
        _ => format!("{} h {:02} min", seconds / 3600, seconds / 60 % 60),
    }
}

/// The status bar while a run goes on, `elapsed` since this Strategy's pass started:
/// "Guess counts: bits-all 1,234 / 14,855, about 12 min left".
pub fn progress_note(progress: &Progress, elapsed: Duration) -> String {
    let counts = format!("Guess counts: {} {} / {}", progress.strategy.id, with_commas(progress.done), with_commas(progress.total));
    if progress.done == 0 || progress.done >= progress.total {
        return counts;
    }
    let left = elapsed.as_secs_f64() / progress.done as f64 * (progress.total - progress.done) as f64;
    let left = match left as u64 {
        0..60 => "under a minute left".to_string(),
        seconds @ 60..5400 => format!("about {} min left", (seconds + 30) / 60),
        seconds => format!("about {} h {:02} min left", seconds / 3600, seconds / 60 % 60),
    };
    format!("{counts}, {left}")
}

/// The status bar when a run has ended, after `elapsed` on `threads` threads.
pub fn end_note(result: &Result<Built, BuildError>, elapsed: Duration, threads: usize) -> String {
    let time = duration_label(elapsed);
    match result {
        Ok(built) if built.stopped => {
            format!("Stopped guess counts after {time}: {} rows kept in precompute-cache/guess-counts/. Run it again to resume", with_commas(built.filled))
        }
        Ok(built) => format!("Saved guess counts to precompute-cache/guess-counts/ in {time} ({} rows, {})", with_commas(built.filled), threads_label(threads)),
        Err(error @ BuildError::Mismatch { .. }) => {
            let error = error.to_string();
            let mut letters = error.chars();
            let error = letters.next().map(|first| first.to_uppercase().chain(letters).collect::<String>()).unwrap_or_default();
            format!("{error}. Start it over with just precompute-guess-counts --fresh")
        }
        Err(error) => format!("Couldn't precompute guess counts: {error}"),
    }
}

#[cfg(test)]
#[path = "guess_counts_tests.rs"]
mod tests;
