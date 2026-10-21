//! The sidebar on the left: the Game's Guesses (and the Answer after a Loss), and the meaning of
//! the one picked, looked up in the Oxford Learner's Dictionary on a background thread. Nothing is
//! looked up until the player clicks a word.

use gpui::{Context, Div, FontWeight, MouseButton, Pixels, SharedString, Window, div, prelude::*, px, rgb, rgba, size};
use gpui_base::{Scrollbar, ScrollbarMode};

use super::WordleApp;
use super::widgets::separator;
use crate::dictionary::{self, Entry, Lookup};
use crate::theme::Theme;

/// The sidebar's width when the app opens, and the least and most it can be dragged to. Each includes the gap beside it.
pub const DEFAULT_WIDTH: Pixels = px(300.);
const MIN_WIDTH: Pixels = px(220.);
const MAX_WIDTH: Pixels = px(520.);
/// The space between islands, which is also the handle that resizes the sidebar.
pub(super) const GAP: Pixels = px(8.);

/// A word's meaning, while it's being looked up and after.
pub enum Meaning {
    Loading,
    Done(Result<Lookup, String>),
}

impl WordleApp {
    /// Open or close the sidebar, widening or narrowing the window by its width so the board keeps its size.
    pub(super) fn toggle_sidebar(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        self.sidebar_open = !self.sidebar_open;
        if !window.is_maximized() && !window.is_fullscreen() {
            let viewport = window.viewport_size();
            let width = if self.sidebar_open { viewport.width + self.sidebar_width } else { viewport.width - self.sidebar_width };
            window.resize(size(width, viewport.height));
        }
        cx.notify();
    }

    /// The strip between the sidebar and the board: drag it to change the sidebar's width.
    pub(super) fn render_sidebar_handle(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let t = self.theme;
        let active = self.resizing_sidebar;
        div()
            .id("sidebar-handle")
            .flex_none()
            .w(GAP)
            .h_full()
            .cursor_col_resize()
            .when(active, |handle| handle.child(div().mx_auto().w(px(2.)).h_full().bg(rgb(t.accent))))
            .hover(move |style| style.bg(rgb(t.overlay)))
            .on_mouse_down(MouseButton::Left, cx.listener(|this, _, _, cx| {
                this.resizing_sidebar = true;
                cx.notify();
            }))
    }

    /// Follow the mouse while the handle is held, keeping the island's right edge under it.
    pub(super) fn drag_sidebar(&mut self, x: Pixels, cx: &mut Context<Self>) {
        if self.resizing_sidebar {
            // The row has 8px of padding on the left, and the handle is GAP wide.
            self.sidebar_width = (x - px(8.) + GAP / 2.).clamp(MIN_WIDTH, MAX_WIDTH);
            cx.notify();
        }
    }

    /// Show `word`'s meaning, looking it up unless it's known already. A failed lookup is tried again.
    pub(super) fn select_word(&mut self, word: String, cx: &mut Context<Self>) {
        self.selected_word = Some(word.clone());
        if !matches!(self.meanings.get(&word), None | Some(Meaning::Done(Err(_)))) {
            return cx.notify();
        }
        self.meanings.insert(word.clone(), Meaning::Loading);
        let lookup = cx.background_spawn({
            let word = word.clone();
            async move { dictionary::lookup(&word) }
        });
        cx.spawn(async move |this, cx| {
            let result = lookup.await;
            this.update(cx, |app, cx| {
                app.meanings.insert(word, Meaning::Done(result));
                cx.notify();
            })
            .ok();
        })
        .detach();
        cx.notify();
    }

    pub(super) fn render_sidebar(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let t = self.theme;
        let subtle = (t.subtle << 8) | 0x99;
        let mut words = div().flex().flex_col().gap_1().p_2();
        for guess in self.shown_guesses() {
            let tiles = guess.word.chars().zip(&guess.feedback).map(|(letter, mark)| {
                let (fill, text) = t.mark(*mark);
                mini_tile(letter, fill, fill, text)
            });
            words = words.child(self.word_row(&guess.word, tiles.collect(), None, cx));
        }
        if self.assist.is_none() && self.game.is_lost() && self.answer_shown {
            let answer = self.game.answer();
            let tiles = answer.chars().map(|letter| mini_tile(letter, t.surface, t.highlight_med, t.text)).collect();
            words = words.child(self.word_row(answer, tiles, Some("Answer"), cx));
        }
        if self.shown_guesses().is_empty() {
            words = words.child(div().px_1().text_xs().text_color(rgb(t.muted)).child("Your Guesses show here. Pick one to see what it means."));
        }

        // An island: the sidebar's width includes the gap beside it, so opening it widens the window by exactly WIDTH.
        div()
            .flex()
            .flex_col()
            .flex_none()
            .w(self.sidebar_width - GAP)
            .h_full()
            .rounded_xl()
            .overflow_hidden()
            .bg(rgb(t.surface))
            .child(heading(t, "GUESSES"))
            .child(words)
            .child(separator(t))
            .child(heading(t, "MEANING"))
            .child(
                div()
                    .relative()
                    .flex_1()
                    .min_h_0()
                    .child(div().id("meaning").size_full().overflow_y_scroll().track_scroll(&self.meaning_scroll).px_3().pb_3().child(self.render_meaning()))
                    .child(div().absolute().inset_0().child(
                        Scrollbar::vertical(&self.meaning_scroll).mode(ScrollbarMode::Always).styles(|styles| styles.thumb(|thumb| thumb.bg(rgba(subtle)).radius(px(3.)))),
                    )),
            )
    }

    /// A Guess (or the Answer) as a row of small tiles; clicking it shows its meaning.
    fn word_row(&self, word: &str, tiles: Vec<Div>, note: Option<&'static str>, cx: &mut Context<Self>) -> impl IntoElement {
        let t = self.theme;
        let selected = self.selected_word.as_deref() == Some(word);
        let looked_up = matches!(self.meanings.get(word), Some(Meaning::Done(Ok(_))));
        let word = word.to_string();
        div()
            .id(SharedString::from(format!("word-{word}-{}", note.unwrap_or(""))))
            .flex()
            .items_center()
            .gap_2()
            .p_1()
            .rounded_md()
            .cursor_pointer()
            .when(selected, |row| row.bg(rgb(t.overlay)))
            .hover(|style| style.bg(rgb(t.overlay)))
            .on_click(cx.listener(move |this, _, _, cx| this.select_word(word.clone(), cx)))
            .child(div().flex().gap_1().children(tiles))
            .children(note.map(|note| div().text_xs().text_color(rgb(t.muted)).child(note)))
            // A dot marks a word whose meaning has been looked up already.
            .when(looked_up, |row| row.child(div().ml_auto().mr_1().size(px(6.)).rounded_full().bg(rgb(t.accent))))
    }

    fn render_meaning(&self) -> Div {
        let t = self.theme;
        let note = |text: String, colour: u32| div().text_sm().text_color(rgb(colour)).child(text);
        let Some(word) = &self.selected_word else {
            return note("Pick a word above.".into(), t.muted);
        };
        let shown = word.to_uppercase();
        match self.meanings.get(word) {
            None | Some(Meaning::Loading) => note(format!("Looking up {shown}…"), t.muted),
            Some(Meaning::Done(Err(error))) => div()
                .flex()
                .flex_col()
                .gap_1()
                .child(note(error.clone(), t.error))
                .child(note("Click the word to try again.".into(), t.muted)),
            Some(Meaning::Done(Ok(Lookup::NotFound))) => note(format!("{shown} isn't in the Oxford Learner's Dictionary."), t.muted),
            Some(Meaning::Done(Ok(Lookup::Suggestions(words)))) => {
                let suggestions = if words.is_empty() { String::new() } else { format!(" Did you mean {}?", words.join(", ")) };
                note(format!("{shown} isn't in the Oxford Learner's Dictionary.{suggestions}"), t.muted)
            }
            Some(Meaning::Done(Ok(Lookup::Found(entries)))) => div().flex().flex_col().gap_4().children(entries.iter().map(|entry| render_entry(t, entry))),
        }
    }
}

fn heading(t: &Theme, text: &'static str) -> impl IntoElement {
    div().px_3().pt_3().pb_1().text_xs().font_weight(FontWeight::BOLD).text_color(rgb(t.muted)).child(text)
}

/// A small lettered tile, as in the Guesses list (and the solver's Path).
pub(super) fn mini_tile(letter: char, fill: u32, border: u32, text: u32) -> Div {
    div()
        .size(px(24.))
        .flex()
        .items_center()
        .justify_center()
        .rounded_sm()
        .bg(rgb(fill))
        .border_1()
        .border_color(rgb(border))
        .text_color(rgb(text))
        .text_xs()
        .font_weight(FontWeight::BOLD)
        .child(letter.to_ascii_uppercase().to_string())
}

/// One part of speech: the headword, its pronunciations, then its numbered senses.
fn render_entry(t: &Theme, entry: &Entry) -> impl IntoElement {
    let phonetics = entry.phonetics.iter().map(|(region, phon)| format!("{region} {phon}")).collect::<Vec<_>>().join("  ");
    let senses = entry.senses.iter().enumerate().map(|(index, sense)| {
        // The number, level and labels on one line; the definition under them, as plain text so it wraps.
        let mut tags = div().flex().flex_wrap().items_center().gap_x_1().text_xs().text_color(rgb(t.muted)).child(format!("{}.", index + 1));
        if let Some(level) = &sense.level {
            tags = tags.child(div().px_1().rounded_sm().bg(rgb(t.overlay)).text_color(rgb(t.subtle)).child(level.clone()));
        }
        for label in &sense.labels {
            tags = tags.child(label.clone());
        }
        div()
            .flex()
            .flex_col()
            .gap_0p5()
            .when_some(sense.signpost.clone(), |sense, signpost| sense.child(div().text_xs().font_weight(FontWeight::BOLD).text_color(rgb(t.accent)).child(signpost)))
            .child(tags)
            .child(div().text_sm().text_color(rgb(t.text)).child(sense.definition.clone()))
            .children(sense.examples.first().map(|example| div().pl_3().text_xs().italic().text_color(rgb(t.subtle)).child(example.clone())))
    });

    div()
        .flex()
        .flex_col()
        .gap_2()
        .child(
            div()
                .flex()
                .items_baseline()
                .gap_2()
                .child(div().text_lg().font_weight(FontWeight::BOLD).text_color(rgb(t.heading)).child(entry.headword.clone()))
                .children(entry.pos.clone().map(|pos| div().text_sm().italic().text_color(rgb(t.subtle)).child(pos))),
        )
        .when(!phonetics.is_empty(), |entry| entry.child(div().text_xs().text_color(rgb(t.muted)).child(phonetics)))
        .children(senses)
}
