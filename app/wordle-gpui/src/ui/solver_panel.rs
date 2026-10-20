//! The solver on the right: the Suggestions with the highest Expected Information (the best Opener
//! before the first Guess), and a chart of how the picked word would split the Candidates. The
//! scoring is in `solver/strategy.rs`; this file holds the panel's state and draws it.
//!
//! The Feedback matrices are read from `matrices/` the first time they are needed, on a
//! background thread, and kept until the app closes. Ranking runs on a background thread too.

use std::collections::HashMap;
use std::sync::Arc;

use gpui::{Context, Div, FontWeight, Pixels, SharedString, Window, div, prelude::*, px, relative, rgb, size};
use wordle_gpui::engine::feedback::Mark;
use wordle_gpui::solver::matrix::default_dir;
use wordle_gpui::solver::strategy::{self, Distribution, Matrix, MatrixSet, SearchMode, Suggestion};
use wordle_gpui::engine::words::{WORD_LENGTH, word_lists};

use super::WordleApp;
use super::widgets::{self, caret, separator};
use crate::overlays::commands::Command;
use crate::theme::Theme;

/// The solver's width, with the gap beside it. Opening it widens the window by this much.
pub const WIDTH: Pixels = px(340.);
/// The space between the board and the solver.
pub const GAP: Pixels = px(8.);
/// How many Suggestions the list shows.
const SUGGESTIONS: usize = 8;
/// The tallest the chart grows before its bars scroll; it draws every group.
const CHART_HEIGHT: Pixels = px(320.);

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
}

impl Default for SolverState {
    fn default() -> Self {
        Self {
            open: false,
            set: MatrixSet::Answers,
            mode: SearchMode::Candidates,
            matrices: HashMap::new(),
            suggestions: Suggestions::Idle,
            candidates: Vec::new(),
            serial: 0,
            selected: None,
            query: String::new(),
            searching: false,
        }
    }
}

impl WordleApp {
    /// Open or close the solver, widening or narrowing the window by its width so the board keeps its size.
    pub(super) fn toggle_solver(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        self.solver.open = !self.solver.open;
        self.solver.searching = false;
        if !window.is_maximized() && !window.is_fullscreen() {
            let viewport = window.viewport_size();
            let width = if self.solver.open { viewport.width + WIDTH } else { viewport.width - WIDTH };
            window.resize(size(width, viewport.height));
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
        let state = self.game.guesses().iter().map(|guess| (guess.word.as_str(), guess.feedback.as_slice()));
        self.solver.candidates = strategy::candidates(state);
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
        let mode = self.solver.mode;
        let ranking = cx.background_spawn(async move { strategy::suggest(&matrix, &candidates, mode, SUGGESTIONS) });
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

    /// Read the matrix of `set` from `matrices/` on a background thread, then rank.
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

    fn set_matrix_set(&mut self, set: MatrixSet, cx: &mut Context<Self>) {
        self.solver.set = set;
        self.refresh_solver(cx);
    }

    fn set_search_mode(&mut self, mode: SearchMode, cx: &mut Context<Self>) {
        self.solver.mode = mode;
        self.refresh_solver(cx);
    }

    /// Show `word`'s Feedback Split in the chart.
    fn select_solver_word(&mut self, word: &str, cx: &mut Context<Self>) {
        self.solver.selected = Some(word.to_string());
        self.solver.searching = false;
        cx.notify();
    }

    /// Put the charted word on the board as the Guess being typed, ready to submit.
    fn type_solver_word(&mut self, word: String, cx: &mut Context<Self>) {
        if !self.game.is_over() {
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
        let opener = self.game.guesses().is_empty();

        let settings = div()
            .flex()
            .flex_col()
            .gap_2()
            .px_3()
            .child(setting_row(
                t,
                "Words",
                segmented(
                    t,
                    [(MatrixSet::Answers, "Answers"), (MatrixSet::ValidGuesses, "Valid guesses")],
                    self.solver.set,
                    |this: &mut WordleApp, set, cx: &mut Context<WordleApp>| this.set_matrix_set(set, cx),
                    cx,
                ),
            ))
            .child(setting_row(
                t,
                "Search",
                segmented(
                    t,
                    [(SearchMode::Candidates, "Candidates"), (SearchMode::Everything, "All words")],
                    self.solver.mode,
                    |this: &mut WordleApp, mode, cx: &mut Context<WordleApp>| this.set_search_mode(mode, cx),
                    cx,
                ),
            ))
            .child(div().text_xs().text_color(rgb(t.muted)).child(match (self.solver.set, self.solver.mode) {
                (MatrixSet::Answers, SearchMode::Candidates) => "Tries Answer List words that could still be the Answer.",
                (MatrixSet::Answers, SearchMode::Everything) => "Tries every Answer List word, even ruled-out ones.",
                (MatrixSet::ValidGuesses, SearchMode::Candidates) => "Tries words that could still be the Answer.",
                (MatrixSet::ValidGuesses, SearchMode::Everything) => "Tries every allowed word, even ones that can't win.",
            }));

        let candidates = self.solver.candidates.len();
        let mut status = div()
            .flex()
            .items_center()
            .justify_between()
            .px_3()
            .pt_3()
            .pb_1()
            .child(div().text_xs().font_weight(FontWeight::BOLD).text_color(rgb(t.muted)).child(if opener { "BEST OPENER" } else { "BEST GUESS" }))
            .child(div().text_xs().text_color(rgb(t.subtle)).child(format!("{} candidate{}", group_thousands(candidates), if candidates == 1 { "" } else { "s" })));
        if !opener && (1..=6).contains(&candidates) {
            let answers = &word_lists().answers;
            let words: Vec<String> = self.solver.candidates.iter().map(|&index| answers[index].to_uppercase()).collect();
            status = div().flex().flex_col().child(status).child(div().px_3().text_xs().text_color(rgb(t.subtle)).child(words.join(" · ")));
        }

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
            .child(status)
            .child(self.render_suggestions(cx))
            .child(separator(t).mx_3().my_2())
            .child(self.render_search(cx))
            .children(self.solver.selected.as_ref().map(|word| match strategy::distribution(word, &self.solver.candidates) {
                Some(chart) => self.render_distribution(&chart, cx).into_any_element(),
                None => note(format!("{} isn't on the Guess List.", word.to_uppercase()), t.muted).into_any_element(),
            }))
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
                list.children(rows)
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
            .child(div().w(px(16.)).text_xs().text_color(rgb(t.muted)).child(format!("{}", rank + 1)))
            .child(div().font_family(widgets::MONO_FONT).font_weight(FontWeight::BOLD).text_color(rgb(t.text)).child(word.to_uppercase()))
            // A dot marks a word that could be the Answer, so guessing it might win now.
            .when(suggestion.is_candidate, |row| row.child(div().size(px(6.)).rounded_full().bg(rgb(t.correct.0))))
            .child(div().ml_auto().text_color(rgb(t.text)).child(format!("{:.2} bits", suggestion.bits)))
            .child(div().w(px(64.)).text_right().text_xs().text_color(rgb(t.muted)).child(format!("≈{} left", format_left(suggestion.expected_left))))
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
            .when(!self.game.is_over(), |header| {
                header.child(widgets::button(t, "solver-type", "Type it").on_click(cx.listener(move |this, _, _, cx| this.type_solver_word(word.clone(), cx))))
            });
        let title = div()
            .text_sm()
            .text_color(rgb(t.text))
            .child(format!("Expected {} words left · {:.2} bits", format_left(chart.expected_left), chart.bits));

        let mut bars = div().id("solver-chart").flex().flex_col().gap_1().max_h(CHART_HEIGHT).overflow_y_scroll();
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

/// A label on the left and its control on the right.
fn setting_row(t: &Theme, label: &'static str, control: impl IntoElement) -> Div {
    div().flex().items_center().justify_between().child(div().text_xs().text_color(rgb(t.subtle)).child(label)).child(control)
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
