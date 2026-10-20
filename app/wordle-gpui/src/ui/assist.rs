//! Solver mode's board, in place of the Game's beside the solver: for a Wordle game played
//! somewhere else. Type each Guess made there, then click its tiles until they show the Feedback
//! it got. The State and its keys are in `solver/assist.rs`.

use gpui::{Context, FontWeight, SharedString, div, prelude::*, px, rgb};
use wordle_gpui::engine::game::MAX_GUESSES;
use wordle_gpui::engine::words::WORD_LENGTH;
use wordle_gpui::solver::assist::Assist;

use super::board::{row, tile};
use super::{WordleApp, widgets};

impl WordleApp {
    pub(super) fn render_assist(&self, assist: &Assist, cx: &mut Context<Self>) -> impl IntoElement {
        let t = self.theme;

        // Entered Guesses: a click on a tile moves it on to its next Mark.
        let entered = assist.guesses.iter().enumerate().map(|(row_index, guess)| {
            row(guess.word.chars().zip(&guess.feedback).enumerate().map(|(letter_index, (letter, mark))| {
                let (fill, text) = t.mark(*mark);
                tile(Some(letter), Some(fill), fill, text)
                    .id(SharedString::from(format!("assist-tile-{row_index}-{letter_index}")))
                    .cursor_pointer()
                    .hover(|style| style.opacity(0.85))
                    .on_click(cx.listener(move |this, _, window, cx| {
                        window.focus(&this.focus_handle, cx);
                        this.cycle_assist_tile(row_index, letter_index, cx);
                    }))
            }))
        });

        // The Guess being typed, then empty rows up to the Guess Limit of the other game.
        let empty_rows = if assist.can_type() { MAX_GUESSES - assist.guesses.len() } else { 0 };
        let typing = (0..empty_rows).map(|row_index| {
            row((0..WORD_LENGTH).map(move |i| {
                let letter = if row_index == 0 { assist.typed.chars().nth(i) } else { None };
                tile(letter, None, if letter.is_some() { t.muted } else { t.highlight_med }, t.text)
            }))
        });

        let note = match (&assist.error, assist.is_solved()) {
            (Some(error), _) => Some((error.to_string(), t.error)),
            (None, true) => Some((format!("Solved in {}", assist.guesses.len()), t.success)),
            (None, false) if assist.guesses.is_empty() => Some(("Type the Guess you made, then press Enter".into(), t.muted)),
            (None, false) => Some(("Click a tile to change its Mark · Backspace takes a Guess back".into(), t.muted)),
        };

        div()
            .flex_1()
            .min_h(px(770.))
            .min_w(px(440.))
            .rounded_xl()
            .bg(rgb(t.surface))
            .flex()
            .flex_col()
            .items_center()
            .gap_3()
            .p_4()
            .child(div().text_3xl().font_weight(FontWeight::BOLD).text_color(rgb(t.heading)).child("SOLVER MODE"))
            .child(div().text_sm().text_color(rgb(t.subtle)).child("For a Wordle played somewhere else: copy its Feedback in here."))
            .child(div().id("assist-board").flex().flex_col().items_center().gap_1p5().flex_1().min_h(px(378.)).overflow_y_scroll().children(entered.chain(typing)))
            .child(div().h(px(52.)).flex_none().text_sm().children(note.map(|(text, colour)| div().text_color(rgb(colour)).child(text))))
            .child(self.render_keyboard(cx))
            .child(
                div()
                    .h(px(76.))
                    .flex_none()
                    .mt_4()
                    .flex()
                    .gap_2()
                    .child(widgets::button(t, "assist-clear", "Start over").on_click(cx.listener(|this, _, _, cx| this.clear_assist(cx))))
                    .child(widgets::button(t, "assist-leave", "Back to the game").on_click(cx.listener(|this, _, window, cx| this.toggle_solver_mode(window, cx)))),
            )
            .on_mouse_down(gpui::MouseButton::Left, cx.listener(|this, _, _, cx| this.leave_solver_search(cx)))
    }

    fn cycle_assist_tile(&mut self, row: usize, letter: usize, cx: &mut Context<Self>) {
        if let Some(assist) = self.assist.as_mut() {
            assist.cycle(row, letter);
            self.refresh_solver(cx);
        }
        cx.notify();
    }

    /// Forget every Guess entered, to copy in a new game.
    fn clear_assist(&mut self, cx: &mut Context<Self>) {
        self.assist = Some(Assist::default());
        self.solver.selected = None;
        self.refresh_solver(cx);
        cx.notify();
    }
}
