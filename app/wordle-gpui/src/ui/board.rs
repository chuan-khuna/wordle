//! The board of tiles and the on-screen keyboard.

use gpui::{Context, Div, FontWeight, Pixels, SharedString, Stateful, div, prelude::*, px, rgb};
use wordle_gpui::engine::feedback::Mark;
use wordle_gpui::engine::hints::{best_marks, live_hint};
use wordle_gpui::engine::words::WORD_LENGTH;

use super::WordleApp;

const KEYBOARD_ROWS: [&str; 3] = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
pub const ENTER: &str = "enter";
pub const BACKSPACE: &str = "backspace";

impl WordleApp {
    pub(super) fn render_board(&self) -> impl IntoElement {
        let submitted = self.game.guesses().iter().map(|guess| {
            row(guess.word.chars().zip(&guess.feedback).map(|(letter, mark)| {
                let (fill, text) = self.theme.mark(*mark);
                tile(Some(letter), Some(fill), fill, text)
            }))
        });

        // The row being typed, then empty rows: up to the Guess Limit, or none in an unlimited Game.
        // With live hints on, a typed letter's border shows what earlier Guesses say about it.
        let empty_rows = match self.game.guesses_left() {
            _ if self.game.is_over() => 0,
            Some(left) => left,
            None => 1,
        };
        let typing = (0..empty_rows).map(|row_index| {
            row((0..WORD_LENGTH).map(move |i| {
                let t = self.theme;
                let letter = if row_index == 0 { self.typed.chars().nth(i) } else { None };
                let hint = letter.filter(|_| self.live_hints).and_then(|letter| live_hint(self.game.guesses(), i, letter));
                let (border, text) = match (letter, hint) {
                    (None, _) => (t.highlight_med, t.text),
                    (Some(_), None) => (t.muted, t.text),
                    (Some(_), Some(Mark::Absent)) => (t.highlight_med, t.muted),
                    (Some(_), Some(mark)) => (t.mark(mark).0, t.text),
                };
                tile(letter, None, border, text)
            }))
        });

        div()
            .id("board")
            .flex()
            .flex_col()
            .items_center()
            .gap_1p5()
            .flex_1()
            .min_h(px(378.))
            .overflow_y_scroll()
            .children(submitted.chain(typing))
    }

    pub(super) fn render_keyboard(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let known = best_marks(self.game.guesses());
        let unused = (self.theme.highlight_med, self.theme.text);
        let mut rows = Vec::new();
        for (row_index, letters) in KEYBOARD_ROWS.iter().enumerate() {
            let mut keys = Vec::new();
            if row_index == 2 {
                keys.push(self.key(ENTER.into(), "ENTER".into(), unused, px(64.), cx));
            }
            for letter in letters.chars() {
                let colours = known.get(&letter).map_or(unused, |mark| match mark {
                    Mark::Absent => self.theme.absent_key,
                    _ => self.theme.mark(*mark),
                });
                keys.push(self.key(letter.to_string(), letter.to_ascii_uppercase().to_string(), colours, px(40.), cx));
            }
            if row_index == 2 {
                keys.push(self.key(BACKSPACE.into(), "⌫".into(), unused, px(64.), cx));
            }
            rows.push(div().flex().justify_center().gap_1p5().w_full().flex_1().min_h_0().children(keys));
        }
        // Three rows of up to 56px keys, which shrink together when the window is too short for the full size.
        div().flex().flex_col().gap_2().w_full().max_w(px(480.)).h(px(184.)).min_h(px(120.)).children(rows)
    }

    fn key(&self, key: String, label: String, (fill, text): (u32, u32), width: Pixels, cx: &mut Context<Self>) -> Stateful<Div> {
        div()
            .id(SharedString::from(format!("key-{key}")))
            .w(width)
            .min_w_0()
            .h_full()
            .max_h(px(56.))
            .flex()
            .items_center()
            .justify_center()
            .rounded_md()
            .bg(rgb(fill))
            .text_color(rgb(text))
            .font_weight(FontWeight::BOLD)
            .text_sm()
            .cursor_pointer()
            .hover(|style| style.opacity(0.85))
            .on_click(cx.listener(move |this, _, window, cx| {
                window.focus(&this.focus_handle, cx);
                this.press(&key, cx);
            }))
            .child(label)
    }
}

fn row(tiles: impl Iterator<Item = Div>) -> Div {
    div().flex().gap_1p5().children(tiles)
}

fn tile(letter: Option<char>, fill: Option<u32>, border: u32, text: u32) -> Div {
    div()
        .size(px(58.))
        .flex()
        .items_center()
        .justify_center()
        .rounded_sm()
        .when_some(fill, |tile, fill| tile.bg(rgb(fill)))
        .border_2()
        .border_color(rgb(border))
        .text_color(rgb(text))
        .text_2xl()
        .font_weight(FontWeight::BOLD)
        .children(letter.map(|l| l.to_ascii_uppercase().to_string()))
}
