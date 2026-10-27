//! The solver on the right: the Suggestions under the Strategy its **Words**, **Search** and **Rank
//! by** settings name (one of the eight), and a chart of how the picked word would split the
//! Candidates. Before the first Guess the Suggestions are the best Openers, ranked over the whole
//! Guess Pool whatever **Search** says. The scoring is in `solver/strategy.rs`; this file holds the
//! panel's state and draws it.
//!
//! In Solver mode it works from the State entered by hand instead of the Game's.
//!
//! The Path records the Guesses so far; clicking a step shows the panel as it was after that many
//! Guesses, and a new Guess goes back to the latest.
//!
//! Before the first Guess it also shows what `summary.json` of the Guess Count Matrices knows under
//! the panel's Strategy (`solver/opener_results.rs`): each Suggestion's Average Guess Count, and the
//! charted word's Average Guess Count, Losses and Guess Distribution, or a note saying why there
//! is none. The summary is read when the panel opens and after Precompute guess counts ends.
//!
//! The Feedback matrices are read from `precompute-cache/feedback/` the first time they are needed, on a
//! background thread, and kept until the app closes. Ranking runs on a background thread too.

use std::collections::HashMap;
use std::sync::Arc;

use gpui::{Context, Div, FontWeight, Pixels, SharedString, Window, div, prelude::*, px, relative, rgb, size, uniform_list};
use wordle_gpui::engine::feedback::Mark;
use wordle_gpui::engine::game::Guess;
use wordle_gpui::solver::assist::Assist;
use wordle_gpui::solver::matrix::default_dir;
use wordle_gpui::solver::opener_results::{self, Lookup, OpenerResult, SummaryFile};
use wordle_gpui::solver::strategy::{self, Distribution, Matrix, MatrixSet, Rank, SearchMode, Strategy, Suggestion};
use wordle_gpui::engine::words::{WORD_LENGTH, word_lists};

use super::WordleApp;
use super::sidebar::mini_tile;
use super::widgets::{self, caret, separator};
use crate::overlays::commands::Command;
use crate::theme::Theme;

/// The solver's width, with the gap beside it. Opening it widens the window by this much.
pub const WIDTH: Pixels = px(340.);
/// The space between the board and the solver.
pub const GAP: Pixels = px(8.);
/// How many Suggestions the list shows.
const SUGGESTIONS: usize = 100;
/// The tallest the Suggestions list grows before it scrolls: eight 28 px rows.
const SUGGESTIONS_HEIGHT: Pixels = px(224.);
/// The tallest the chart grows before its bars scroll; it draws every group.
const CHART_HEIGHT: Pixels = px(320.);
/// The tallest the Candidate grid grows before it scrolls: five rows.
const CANDIDATES_HEIGHT: f32 = 120.;
/// The height of one row of the Candidate grid, which `uniform_list` needs to draw only the rows in view.
const CANDIDATE_ROW_HEIGHT: f32 = 24.;
/// Up to this many Candidates are drawn in the text colour; more are greyed.
const BRIGHT_WORDS: usize = 10;
/// Candidates per row of the grid.
const GRID_COLUMNS: usize = 5;

/// A Feedback matrix: being read, read, or missing.
pub enum MatrixLoad {
    Loading,
    Ready(Arc<Matrix>),
    Failed(String),
}

/// The ranked Suggestions for the current State.
pub enum Suggestions {
    /// Nothing to show: the matrix isn't ready.
    Idle,
    Computing,
    Ready(Vec<Suggestion>),
}

pub struct SolverState {
    pub open: bool,
    pub set: MatrixSet,
    pub mode: SearchMode,
    pub by: Rank,
    matrices: HashMap<MatrixSet, MatrixLoad>,
    suggestions: Suggestions,
    /// The Candidates for the current State, as Answer List indices.
    candidates: Vec<usize>,
    /// Counts rankings, so a slow old one can't replace a newer one.
    serial: u32,
    /// The word whose Feedback Split the chart shows.
    pub selected: Option<String>,
    /// What's typed into the search field.
    query: String,
    /// Whether keys go to the search field rather than the board.
    pub searching: bool,
    /// Whether the Candidate list is shown or folded down to its heading.
    candidates_open: bool,
    /// The Guess Count Matrices' `summary.json`, once read.
    summary: Option<Arc<SummaryFile>>,
    /// Counts summary reads, so a slow old one can't replace a newer one.
    summary_serial: u32,
    /// The Guesses the panel last saw: the Path, recorded on every refresh.
    path: Vec<Guess>,
    /// The Candidates left at each step of the Path: before any Guess, then after each one.
    path_left: Vec<usize>,
    /// The step of the Path the panel shows (that many Guesses made), or `None` to follow the latest.
    step: Option<usize>,
    /// Whether the Path is shown or folded down to its heading (folded at first).
    path_open: bool,
}

impl Default for SolverState {
    fn default() -> Self {
        Self {
            open: false,
            set: MatrixSet::Answers,
            mode: SearchMode::Candidates,
            by: Rank::Bits,
            matrices: HashMap::new(),
            suggestions: Suggestions::Idle,
            candidates: Vec::new(),
            serial: 0,
            selected: None,
            query: String::new(),
            searching: false,
            candidates_open: true,
            summary: None,
            summary_serial: 0,
            path: Vec::new(),
            path_left: Vec::new(),
            step: None,
            path_open: false,
        }
    }
}

impl SolverState {
    /// The Guesses up to the step the panel shows: the whole Path unless an earlier step was picked.
    fn viewed(&self) -> &[Guess] {
        &self.path[..self.step.unwrap_or(self.path.len()).min(self.path.len())]
    }
}

impl WordleApp {
    /// Open or close the solver, widening or narrowing the window by its width so the board keeps its size.
    /// Solver mode keeps it open.
    pub(super) fn toggle_solver(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        if self.assist.is_some() && self.solver.open {
            return self.show_status("Solver mode keeps the solver open", cx);
        }
        self.solver.open = !self.solver.open;
        self.solver.searching = false;
        if !window.is_maximized() && !window.is_fullscreen() {
            let viewport = window.viewport_size();
            let width = if self.solver.open { viewport.width + WIDTH } else { viewport.width - WIDTH };
            window.resize(size(width, viewport.height));
        }
        if self.solver.open {
            self.reload_summary(cx);
        }
        self.refresh_solver(cx);
        cx.notify();
    }

    /// Turn Solver mode on, opening the solver beside its board, or off, back to the Game. Leaving
    /// it keeps the solver open.
    pub(super) fn toggle_solver_mode(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        self.solver.searching = false;
        self.solver.selected = None;
        if self.assist.take().is_none() {
            if !self.solver.open {
                self.toggle_solver(window, cx);
            }
            self.assist = Some(Assist::default());
        }
        self.refresh_solver(cx);
        cx.notify();
    }

    /// Work out the Candidates again and rank the Suggestions, reading the matrix first if needed.
    /// Does nothing while the solver is closed; opening it calls this.
    pub(super) fn refresh_solver(&mut self, cx: &mut Context<Self>) {
        if !self.solver.open {
            return;
        }
        // A changed Path (a new Guess, a new Game, a Mark clicked in Solver mode) goes back to the latest step.
        if self.solver.path != self.shown_guesses() {
            self.solver.path = self.shown_guesses().to_vec();
            self.solver.step = None;
            self.solver.path_left = (0..=self.solver.path.len()).map(|step| strategy::candidates(state_of(&self.solver.path[..step])).len()).collect();
        }
        self.solver.candidates = strategy::candidates(state_of(self.solver.viewed()));
        self.solver.serial += 1;

        let set = self.solver.set;
        let matrix = match self.solver.matrices.get(&set) {
            Some(MatrixLoad::Ready(matrix)) => matrix.clone(),
            Some(MatrixLoad::Loading) => return self.solver.suggestions = Suggestions::Computing,
            Some(MatrixLoad::Failed(_)) => return self.solver.suggestions = Suggestions::Idle,
            None => {
                self.solver.suggestions = Suggestions::Computing;
                return self.load_matrix(set, cx);
            }
        };

        self.solver.suggestions = Suggestions::Computing;
        let serial = self.solver.serial;
        let candidates = self.solver.candidates.clone();
        // The Opener comes from the whole Guess Pool; Search applies from the second Guess on.
        let mode = self.solver.mode.for_guess(self.solver.viewed().len());
        let by = self.solver.by;
        let ranking = cx.background_spawn(async move { strategy::suggest(&matrix, &candidates, mode, by, SUGGESTIONS) });
        cx.spawn(async move |this, cx| {
            let suggestions = ranking.await;
            this.update(cx, |app, cx| {
                if app.solver.serial == serial {
                    app.solver.suggestions = Suggestions::Ready(suggestions);
                    cx.notify();
                }
            })
            .ok();
        })
        .detach();
        cx.notify();
    }

    /// Read the matrix of `set` from `precompute-cache/feedback/` on a background thread, then rank.
    fn load_matrix(&mut self, set: MatrixSet, cx: &mut Context<Self>) {
        self.solver.matrices.insert(set, MatrixLoad::Loading);
        let reading = cx.background_spawn(async move { Matrix::load(&default_dir(), set) });
        cx.spawn(async move |this, cx| {
            let loaded = reading.await;
            this.update(cx, |app, cx| {
                let load = match loaded {
                    Ok(matrix) => MatrixLoad::Ready(Arc::new(matrix)),
                    Err(error) => MatrixLoad::Failed(error.to_string()),
                };
                app.solver.matrices.insert(set, load);
                app.refresh_solver(cx);
                cx.notify();
            })
            .ok();
        })
        .detach();
    }

    /// Forget the matrices read so far (they were just precomputed again) and read them afresh.
    pub(super) fn reload_matrices(&mut self, cx: &mut Context<Self>) {
        self.solver.matrices.clear();
        self.refresh_solver(cx);
    }

    /// Read the Guess Count Matrices' `summary.json` again, on a background thread. Done when the
    /// panel opens and when Precompute guess counts ends; while closed it is read on the next open.
    pub(super) fn reload_summary(&mut self, cx: &mut Context<Self>) {
        if !self.solver.open {
            return;
        }
        self.solver.summary_serial += 1;
        let serial = self.solver.summary_serial;
        let reading = cx.background_spawn(async move { opener_results::read_default_summary() });
        cx.spawn(async move |this, cx| {
            let summary = reading.await;
            this.update(cx, |app, cx| {
                if app.solver.summary_serial == serial {
                    app.solver.summary = Some(Arc::new(summary));
                    cx.notify();
                }
            })
            .ok();
        })
        .detach();
    }

    /// What the summary says about `word` under the panel's Strategy, given the Guesses so far.
    fn opener_lookup<'a>(&'a self, word: &'a str) -> Lookup<'a> {
        let strategy = Strategy::named(self.solver.set, self.solver.mode, self.solver.by);
        opener_results::lookup(self.solver.summary.as_deref(), strategy, word, self.solver.viewed().len())
    }

    /// Show the solver as it was after `step` Guesses of the Path, charting the Guess made next
    /// (if any). The last step follows the latest again.
    fn show_step(&mut self, step: usize, cx: &mut Context<Self>) {
        self.solver.step = (step < self.solver.path.len()).then_some(step);
        if let Some(next) = self.solver.path.get(step) {
            self.solver.selected = Some(next.word.clone());
        }
        self.refresh_solver(cx);
        cx.notify();
    }

    fn set_matrix_set(&mut self, set: MatrixSet, cx: &mut Context<Self>) {
        self.solver.set = set;
        self.refresh_solver(cx);
    }

    fn set_search_mode(&mut self, mode: SearchMode, cx: &mut Context<Self>) {
        self.solver.mode = mode;
        self.refresh_solver(cx);
    }

    fn set_rank(&mut self, by: Rank, cx: &mut Context<Self>) {
        self.solver.by = by;
        self.refresh_solver(cx);
    }

    fn toggle_candidates(&mut self, cx: &mut Context<Self>) {
        self.solver.candidates_open = !self.solver.candidates_open;
        cx.notify();
    }

    /// Show `word`'s Feedback Split in the chart.
    fn select_solver_word(&mut self, word: &str, cx: &mut Context<Self>) {
        self.solver.selected = Some(word.to_string());
        self.solver.searching = false;
        cx.notify();
    }

    /// Put the charted word on the board as the Guess being typed, ready to submit.
    fn type_solver_word(&mut self, word: String, cx: &mut Context<Self>) {
        if let Some(assist) = self.assist.as_mut() {
            assist.type_word(&word);
        } else if !self.game.is_over() {
            self.typed = word;
            self.message = None;
        }
        cx.notify();
    }

    /// A key while the search field has focus: letters, Backspace, and Enter or Escape to leave it.
    pub(super) fn solver_key(&mut self, key: &str, cx: &mut Context<Self>) {
        match key {
            "enter" | "escape" => self.solver.searching = false,
            "backspace" => {
                self.solver.query.pop();
            }
            _ => {
                let mut letters = key.chars();
                if let (Some(letter), None) = (letters.next(), letters.next())
                    && letter.is_ascii_alphabetic()
                    && self.solver.query.len() < WORD_LENGTH
                {
                    self.solver.query.push(letter.to_ascii_lowercase());
                }
            }
        }
        self.chart_query();
        cx.notify();
    }

    /// Pasted text into the search field: its letters, as if typed.
    pub(super) fn solver_paste(&mut self, text: &str) {
        for letter in text.chars().filter(char::is_ascii_alphabetic) {
            if self.solver.query.len() < WORD_LENGTH {
                self.solver.query.push(letter.to_ascii_lowercase());
            }
        }
        self.chart_query();
    }

    /// A searched word on the Guess List goes straight into the chart.
    fn chart_query(&mut self) {
        if word_lists().guesses.contains(self.solver.query.as_str()) {
            self.solver.selected = Some(self.solver.query.clone());
        }
    }

    pub(super) fn render_solver(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let t = self.theme;
        let opener = self.solver.viewed().is_empty();
        let strategy = Strategy::named(self.solver.set, self.solver.mode, self.solver.by);

        let settings = div()
            .flex()
            .flex_col()
            .gap_2()
            .px_3()
            .child(setting_row(
                t,
                "Guess Pool",
                segmented(
                    t,
                    [(MatrixSet::Answers, "Answer List"), (MatrixSet::ValidGuesses, "Guess List")],
                    self.solver.set,
                    |this: &mut WordleApp, set, cx: &mut Context<WordleApp>| this.set_matrix_set(set, cx),
                    cx,
                ),
            ))
            .child(setting_row(
                t,
                "Search Scope",
                segmented(
                    t,
                    [(SearchMode::Candidates, "Candidates only"), (SearchMode::Everything, "All words")],
                    self.solver.mode,
                    |this: &mut WordleApp, mode, cx: &mut Context<WordleApp>| this.set_search_mode(mode, cx),
                    cx,
                ),
            ))
            .child(setting_row(
                t,
                "Ranking",
                segmented(
                    t,
                    [(Rank::Bits, "Expected Information"), (Rank::ExpectedCandidates, "Expected Candidates")],
                    self.solver.by,
                    |this: &mut WordleApp, by, cx: &mut Context<WordleApp>| this.set_rank(by, cx),
                    cx,
                ),
            ))
            .child(div().text_xs().text_color(rgb(t.muted)).child(match (opener, self.solver.set, self.solver.mode) {
                (true, MatrixSet::Answers, _) => "The Opener: tries every Answer List word.",
                (true, MatrixSet::ValidGuesses, _) => "The Opener: tries every Guess List word.",
                (false, MatrixSet::Answers, SearchMode::Candidates) => "Tries Answer List words that could still be the Answer.",
                (false, MatrixSet::Answers, SearchMode::Everything) => "Tries every Answer List word, even ruled-out ones.",
                (false, MatrixSet::ValidGuesses, SearchMode::Candidates) => "Tries words that could still be the Answer.",
                (false, MatrixSet::ValidGuesses, SearchMode::Everything) => "Tries every Guess List word, even ones that can't win.",
            }))
            .child(div().text_xs().text_color(rgb(t.muted)).child(format!("Strategy: {}", strategy.name)));

        let status = div()
            .px_3()
            .pb_1()
            .text_xs()
            .font_weight(FontWeight::BOLD)
            .text_color(rgb(t.muted))
            .child(match self.solver.step {
                _ if opener => "BEST OPENER".to_string(),
                Some(step) => format!("BEST GUESS AFTER GUESS {step}"),
                None => "BEST GUESS".to_string(),
            });

        div()
            .id("solver")
            .flex()
            .flex_col()
            .flex_none()
            .w(WIDTH - GAP)
            .h_full()
            .rounded_xl()
            .overflow_y_scroll()
            .bg(rgb(t.surface))
            .pb_3()
            .child(div().px_3().pt_3().pb_2().text_xs().font_weight(FontWeight::BOLD).text_color(rgb(t.muted)).child("SOLVER"))
            .child(settings)
            .child(separator(t).mx_3().my_2())
            .when(!self.solver.path.is_empty(), |panel| panel.child(self.render_path(cx)).child(separator(t).mx_3().my_2()))
            .child(self.render_candidates(cx))
            .child(separator(t).mx_3().my_2())
            .child(status)
            .child(self.render_suggestions(cx))
            .child(separator(t).mx_3().my_2())
            .child(self.render_search(cx))
            .children(self.solver.selected.as_ref().map(|word| match strategy::distribution(word, &self.solver.candidates) {
                Some(chart) => self.render_distribution(&chart, cx).into_any_element(),
                None => note(format!("{} isn't on the Guess List.", word.to_uppercase()), t.muted).into_any_element(),
            }))
            .children(self.solver.selected.as_ref().filter(|word| word_lists().guesses.contains(word.as_str())).and_then(|word| self.render_guess_counts(word, cx)))
    }

    fn render_suggestions(&self, cx: &mut Context<Self>) -> Div {
        let t = self.theme;
        let list = div().flex().flex_col().px_1();
        match (&self.solver.suggestions, self.solver.matrices.get(&self.solver.set)) {
            (_, Some(MatrixLoad::Failed(error))) => list.child(note(error.clone(), t.error)).child(
                div().px_2().pt_2().child(
                    widgets::button(t, "solver-precompute", "Precompute matrices…").on_click(cx.listener(|this, _, window, cx| this.run(Command::Precompute, window, cx))),
                ),
            ),
            (Suggestions::Computing, Some(MatrixLoad::Loading)) => list.child(note("Reading the matrix…".into(), t.muted)),
            (Suggestions::Computing | Suggestions::Idle, _) => list.child(note("Ranking…".into(), t.muted)),
            (Suggestions::Ready(suggestions), _) if suggestions.is_empty() => list.child(note("No word fits every Feedback so far.".into(), t.muted)),
            (Suggestions::Ready(suggestions), _) => {
                let rows: Vec<_> = suggestions.iter().enumerate().map(|(rank, suggestion)| self.suggestion_row(rank, suggestion, cx).into_any_element()).collect();
                list.child(div().id("solver-suggestions").max_h(SUGGESTIONS_HEIGHT).overflow_y_scroll().on_scroll_wheel(keep_scroll).children(rows))
            }
        }
    }

    /// One Suggestion: its rank, the word (with a dot if it could be the Answer), its bits and the
    /// Candidates expected to be left. Clicking it charts its Feedback Split.
    fn suggestion_row(&self, rank: usize, suggestion: &Suggestion, cx: &mut Context<Self>) -> impl IntoElement {
        let t = self.theme;
        let word = suggestion.word;
        let selected = self.solver.selected.as_deref() == Some(word);
        div()
            .id(SharedString::from(format!("suggestion-{word}")))
            .flex()
            .items_center()
            .gap_2()
            .h(px(28.))
            .px_2()
            .rounded_md()
            .cursor_pointer()
            .text_sm()
            .when(selected, |row| row.bg(rgb(t.overlay)))
            .hover(|style| style.bg(rgb(t.overlay)))
            .on_click(cx.listener(move |this, _, _, cx| this.select_solver_word(word, cx)))
            .child(div().w(px(22.)).text_xs().text_color(rgb(t.muted)).child(format!("{}", rank + 1)))
            .child(div().font_family(widgets::MONO_FONT).font_weight(FontWeight::BOLD).text_color(rgb(t.text)).child(word.to_uppercase()))
            // A dot marks a word that could be the Answer, so guessing it might win now.
            .when(suggestion.is_candidate, |row| row.child(div().size(px(6.)).rounded_full().bg(rgb(t.correct.0))))
            .child(div().ml_auto().text_color(rgb(t.text)).child(format!("{:.2} bits", suggestion.bits)))
            // Before the first Guess: the Average Guess Count the summary has for this Opener.
            .children(self.opener_lookup(word).result().map(|result| {
                div().w(px(40.)).text_right().text_xs().text_color(rgb(t.accent)).child(format!("{:.3}", result.average_guess_count))
            }))
            .child(div().w(px(64.)).text_right().text_xs().text_color(rgb(t.muted)).child(format!("≈{} left", format_left(suggestion.expected_left))))
    }

    /// The Path: Start, then each Guess with its Feedback and the Candidates left after it. Clicking
    /// a step shows the solver as it was there; the step shown is highlighted. Folded by default;
    /// clicking the heading opens it.
    fn render_path(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let t = self.theme;
        let path = &self.solver.path;
        let shown = self.solver.step.unwrap_or(path.len());
        let open = self.solver.path_open;
        let rows = (0..=path.len()).map(|step| {
            let label = match step {
                0 => div().h(px(24.)).flex().items_center().text_sm().text_color(rgb(t.text)).child("Start"),
                _ => div().flex().gap_1().children(path[step - 1].word.chars().zip(&path[step - 1].feedback).map(|(letter, mark)| {
                    let (fill, text) = t.mark(*mark);
                    mini_tile(letter, fill, fill, text)
                })),
            };
            let left = self.solver.path_left.get(step).copied().unwrap_or(0);
            div()
                .id(SharedString::from(format!("path-{step}")))
                .flex()
                .items_center()
                .gap_2()
                .p_1()
                .rounded_md()
                .cursor_pointer()
                .when(step == shown, |row| row.bg(rgb(t.overlay)))
                .hover(|style| style.bg(rgb(t.overlay)))
                .on_click(cx.listener(move |this, _, _, cx| this.show_step(step, cx)))
                .child(div().w(px(16.)).text_xs().text_color(rgb(t.muted)).child(if step == 0 { String::new() } else { step.to_string() }))
                .child(label)
                .child(div().ml_auto().text_xs().text_color(rgb(t.muted)).child(format!("{} left", group_thousands(left))))
        });
        div()
            .flex()
            .flex_col()
            .gap_1()
            .px_3()
            .child(
                div()
                    .id("solver-path-toggle")
                    .flex()
                    .items_center()
                    .gap_1()
                    .cursor_pointer()
                    .text_xs()
                    .font_weight(FontWeight::BOLD)
                    .text_color(rgb(t.muted))
                    .on_click(cx.listener(|this, _, _, cx| {
                        this.solver.path_open = !this.solver.path_open;
                        cx.notify();
                    }))
                    .child(widgets::icon(if open { widgets::IconName::ChevronDown } else { widgets::IconName::ChevronRight }, t.muted))
                    .child("PATH"),
            )
            .when(open, |section| section.children(rows.collect::<Vec<_>>()))
    }

    /// Every current Candidate, in Answer List order, in a grid of cells that scrolls once it is
    /// full. A `uniform_list` draws only the rows in view, so the 2,315 words before the first
    /// Guess stay cheap. Clicking the heading folds the list away.
    fn render_candidates(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let t = self.theme;
        let answers = &word_lists().answers;
        let words: Arc<Vec<String>> = Arc::new(self.solver.candidates.iter().map(|&index| answers[index].to_uppercase()).collect());
        let count = words.len();
        let open = self.solver.candidates_open;
        let body = if words.is_empty() {
            div().text_color(rgb(t.muted)).child("No word fits every Feedback so far.").into_any_element()
        } else {
            // A grid, GRID_COLUMNS words to a row; only the rows in view are drawn.
            let rows = count.div_ceil(GRID_COLUMNS);
            let height = (CANDIDATE_ROW_HEIGHT * rows as f32).min(CANDIDATES_HEIGHT);
            uniform_list("solver-candidates", rows, move |range, _, _| {
                range
                    .map(|row| {
                        let cells = words[row * GRID_COLUMNS..((row + 1) * GRID_COLUMNS).min(words.len())].iter().map(|word| div().child(word.clone()));
                        div().w_full().grid().grid_cols(GRID_COLUMNS as u16).items_center().h(px(CANDIDATE_ROW_HEIGHT)).children(cells)
                    })
                    .collect::<Vec<_>>()
            })
            .h(px(height))
            .on_scroll_wheel(keep_scroll)
            .font_family(widgets::MONO_FONT)
            .font_weight(FontWeight::BOLD)
            .text_sm()
            // Few enough to read at a glance: full text colour; more are greyed.
            .text_color(rgb(if count <= BRIGHT_WORDS { t.text } else { t.subtle }))
            .into_any_element()
        };
        div()
            .flex()
            .flex_col()
            .gap_1()
            .px_3()
            .child(
                div()
                    .id("solver-candidates-toggle")
                    .flex()
                    .items_center()
                    .gap_1()
                    .cursor_pointer()
                    .text_xs()
                    .font_weight(FontWeight::BOLD)
                    .text_color(rgb(t.muted))
                    .on_click(cx.listener(|this, _, _, cx| this.toggle_candidates(cx)))
                    .child(widgets::icon(if open { widgets::IconName::ChevronDown } else { widgets::IconName::ChevronRight }, t.muted))
                    .child(format!("CANDIDATES ({})", group_thousands(count))),
            )
            .when(open, |section| section.child(body))
    }

    /// The field to chart any word on the Guess List. Clicking it sends the keys there instead of the board.
    fn render_search(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let t = self.theme;
        let searching = self.solver.searching;
        let query = &self.solver.query;
        let text = if query.is_empty() {
            div().text_color(rgb(t.muted)).child("Search a word to chart…")
        } else {
            div().font_family(widgets::MONO_FONT).text_color(rgb(t.text)).child(query.to_uppercase())
        };
        let invalid = query.len() == WORD_LENGTH && !word_lists().guesses.contains(query.as_str());
        div()
            .flex()
            .flex_col()
            .gap_1()
            .px_3()
            .child(
                div()
                    .id("solver-search")
                    .flex()
                    .items_center()
                    .h(px(30.))
                    .px_2()
                    .rounded_md()
                    .border_1()
                    .border_color(rgb(if searching { t.accent } else { t.highlight_med }))
                    .bg(rgb(t.background))
                    .cursor_pointer()
                    .text_sm()
                    .on_click(cx.listener(|this, _, _, cx| {
                        this.solver.searching = true;
                        cx.notify();
                    }))
                    .child(text)
                    .when(searching, |field| field.child(caret(t))),
            )
            .when(invalid, |field| field.child(div().text_xs().text_color(rgb(t.error)).child(format!("{} isn't on the Guess List", query.to_uppercase()))))
    }

    /// The Feedback Split of one word as horizontal bars: one bar per Feedback, drawn as its five
    /// Marks, as long as the number of Candidates that would give it.
    fn render_distribution(&self, chart: &Distribution, cx: &mut Context<Self>) -> impl IntoElement {
        let t = self.theme;
        let word = chart.word.clone();
        let most = chart.groups.first().map_or(1, |group| group.count).max(1);

        let header = div()
            .flex()
            .items_center()
            .justify_between()
            .child(div().font_family(widgets::MONO_FONT).font_weight(FontWeight::BOLD).text_color(rgb(t.heading)).child(chart.word.to_uppercase()))
            // Not while the precompute view hides the board, nor at an earlier step of the Path.
            .when(self.precompute.is_none() && self.solver.step.is_none() && self.assist.as_ref().map_or(!self.game.is_over(), Assist::can_type), |header| {
                header.child(widgets::button(t, "solver-type", "Type it").on_click(cx.listener(move |this, _, _, cx| this.type_solver_word(word.clone(), cx))))
            });
        let title = div()
            .text_sm()
            .text_color(rgb(t.text))
            .child(format!("Expected {} words left · {:.2} bits", format_left(chart.expected_left), chart.bits));

        let mut bars = div().id("solver-chart").flex().flex_col().gap_1().max_h(CHART_HEIGHT).overflow_y_scroll().on_scroll_wheel(keep_scroll);
        for group in &chart.groups {
            let win = group.marks() == [Mark::Correct; WORD_LENGTH];
            let fill = if win { t.correct.0 } else { t.subtle };
            bars = bars.child(
                div()
                    .flex()
                    .items_center()
                    .gap_2()
                    .child(pattern(t, group.marks()))
                    .child(div().flex_1().h(px(12.)).child(div().h_full().w(relative(group.count as f32 / most as f32)).min_w(px(2.)).rounded_sm().bg(rgb(fill))))
                    .child(div().w(px(36.)).text_right().text_xs().text_color(rgb(t.text)).child(group_thousands(group.count))),
            );
        }

        div()
            .flex()
            .flex_col()
            .gap_2()
            .px_3()
            .pt_3()
            .child(header)
            .child(title)
            .child(div().text_xs().text_color(rgb(t.muted)).child(format!("{} Feedbacks over {} candidates", chart.groups.len(), group_thousands(chart.candidates))))
            .child(bars)
            .child(div().text_xs().text_color(rgb(t.muted)).text_right().child("number of possible words →"))
    }
}

impl WordleApp {
    /// Below the Feedback Split, before the first Guess: the charted word's Average Guess Count,
    /// Losses and Guess Distribution under the panel's Strategy, or a note saying why there are none
    /// (with the command that fills them, when one does). Nothing after the first Guess.
    fn render_guess_counts(&self, word: &str, cx: &mut Context<Self>) -> Option<Div> {
        let t = self.theme;
        let lookup = self.opener_lookup(word);
        let section = div().flex().flex_col().gap_2().px_3().pt_3();
        if let Some(result) = lookup.result() {
            let strategy = Strategy::named(self.solver.set, self.solver.mode, self.solver.by).id;
            return Some(self.render_guess_distribution(section, result, strategy));
        }
        let text = lookup.note()?;
        let section = section.child(div().text_xs().font_weight(FontWeight::BOLD).text_color(rgb(t.muted)).child("GUESS DISTRIBUTION")).child(div().text_xs().text_color(rgb(t.muted)).child(text));
        Some(section.when(lookup.offers_command(), |section| {
            section.child(div().child(
                widgets::button(t, "solver-precompute-guess-counts", opener_results::COMMAND).on_click(cx.listener(|this, _, window, cx| this.run(Command::PrecomputeGuessCounts, window, cx))),
            ))
        }))
    }

    /// Games per Guess Count (1 to 6), then the Losses, as horizontal bars drawn like the Feedback Split's.
    fn render_guess_distribution(&self, section: Div, result: &OpenerResult, strategy: &str) -> Div {
        let t = self.theme;
        let bars = result.bars();
        let most = bars.iter().map(|bar| bar.games).max().unwrap_or(1).max(1);
        let mut chart = div().flex().flex_col().gap_1();
        for bar in &bars {
            let fill = if bar.lost { t.error } else { t.correct.0 };
            chart = chart.child(
                div()
                    .flex()
                    .items_center()
                    .gap_2()
                    .child(div().w(px(28.)).text_xs().text_color(rgb(if bar.lost { t.error } else { t.subtle })).child(bar.label))
                    .child(
                        div().flex_1().h(px(12.)).when(bar.games > 0, |track| {
                            track.child(div().h_full().w(relative(bar.games as f32 / most as f32)).min_w(px(2.)).rounded_sm().bg(rgb(fill)))
                        }),
                    )
                    .child(div().w(px(36.)).text_right().text_xs().text_color(rgb(t.text)).child(group_thousands(bar.games))),
            );
        }
        let losses = match result.losses {
            0 => "no Losses".to_string(),
            1 => "1 Loss".to_string(),
            n => format!("{} Losses", group_thousands(n)),
        };
        section
            .child(div().text_xs().font_weight(FontWeight::BOLD).text_color(rgb(t.muted)).child("GUESS DISTRIBUTION"))
            .child(div().text_sm().text_color(rgb(t.text)).child(format!("{:.3} Guesses on average · {losses}", result.average_guess_count)))
            .child(div().text_xs().text_color(rgb(t.muted)).child(format!("Rank {} under {strategy}, every Answer played to a Win", group_thousands(result.rank))))
            .child(chart)
            .child(div().text_xs().text_color(rgb(t.muted)).text_right().child("number of Answers →"))
    }
}

/// A label above its control (the Ranking's two names don't fit beside a label in the panel's width).
fn setting_row(t: &Theme, label: &'static str, control: impl IntoElement) -> Div {
    div().flex().flex_col().items_start().gap_1().child(div().text_xs().text_color(rgb(t.subtle)).child(label)).child(control)
}

/// Two or more buttons joined together, one of them chosen.
fn segmented<T: Copy + PartialEq + std::fmt::Debug + 'static, const N: usize>(
    t: &Theme,
    options: [(T, &'static str); N],
    current: T,
    pick: fn(&mut WordleApp, T, &mut Context<WordleApp>),
    cx: &mut Context<WordleApp>,
) -> Div {
    let overlay = t.overlay;
    div().flex().p(px(2.)).gap(px(2.)).rounded_md().bg(rgb(t.background)).children(options.into_iter().map(|(value, label)| {
        let chosen = value == current;
        div()
            .id(SharedString::from(format!("segment-{value:?}")))
            .px_2()
            .py_0p5()
            .rounded_sm()
            .cursor_pointer()
            .text_xs()
            .text_color(rgb(if chosen { t.text } else { t.subtle }))
            .when(chosen, |segment| segment.bg(rgb(t.overlay)))
            .hover(move |style| style.bg(rgb(overlay)))
            .on_click(cx.listener(move |this, _, _, cx| {
                pick(this, value, cx);
                cx.notify();
            }))
            .child(label)
    }))
}

/// A Feedback as five small tiles in the theme's Mark colours.
fn pattern(t: &Theme, marks: [Mark; WORD_LENGTH]) -> Div {
    div().flex().flex_none().gap(px(2.)).children(marks.into_iter().map(|mark| div().size(px(12.)).rounded(px(2.)).bg(rgb(t.mark(mark).0))))
}

/// Guesses as the State `strategy::candidates` takes.
fn state_of(guesses: &[Guess]) -> impl Iterator<Item = (&str, &[Mark])> + Clone {
    guesses.iter().map(|guess| (guess.word.as_str(), guess.feedback.as_slice()))
}

fn note(text: String, colour: u32) -> Div {
    div().px_2().py_1().text_sm().text_color(rgb(colour)).child(text)
}

/// 2315 as "2,315".
fn group_thousands(number: usize) -> String {
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

/// An expected number of words: one decimal place while it is small, whole words after.
fn format_left(left: f64) -> String {
    if left < 10.0 { format!("{left:.1}") } else { format!("{left:.0}") }
}

/// For a scroll area inside the panel: gpui hands a wheel event to every scroll area under the
/// pointer, so once the inner area has scrolled (its own scroll listener runs before this one), stop
/// the event there and the panel around it stays put.
fn keep_scroll(_: &gpui::ScrollWheelEvent, _: &mut Window, cx: &mut gpui::App) {
    cx.stop_propagation();
}
