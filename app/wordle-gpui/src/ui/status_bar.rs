//! The bar along the bottom of the window, like Zed's: the sidebar button on the left; the Guess
//! Limit, the Seed (with a button that copies it) and the Guesses left on the right.

use gpui::{Context, Div, Pixels, SharedString, Stateful, div, prelude::*, px, rgb};

use super::WordleApp;
use crate::commands::Command;
use crate::theme::Theme;

const HEIGHT: Pixels = px(28.);

impl WordleApp {
    /// Guesses left, or the Guess count when unlimited.
    fn guesses_status(&self) -> String {
        match self.game.guesses_left() {
            Some(left) => format!("{left} guesses left"),
            None => format!("guess {} · no limit", self.game.guesses().len()),
        }
    }

    pub(super) fn render_status_bar(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let t = self.theme;
        let mode = if self.game.is_unlimited() { "unlimited" } else { "classic" };
        let dot = || div().text_color(rgb(t.muted)).child("·");
        let seed = match self.game.seed {
            Some(seed) => div()
                .flex()
                .items_center()
                .gap_1()
                .child(format!("seed {seed}"))
                .child(icon_button(t, "copy-seed", copy_icon(t)).on_click(cx.listener(|this, _, window, cx| this.run(Command::CopySeed, window, cx)))),
            None => div().child("chosen answer"),
        };

        div()
            .flex()
            .flex_none()
            .items_center()
            .justify_between()
            .w_full()
            .h(HEIGHT)
            .px_1()
            .bg(rgb(t.surface))
            .border_t_1()
            .border_color(rgb(t.overlay))
            .text_xs()
            .text_color(rgb(t.subtle))
            .child(
                icon_button(t, "toggle-sidebar", sidebar_icon(t, self.sidebar_open))
                    .when(self.sidebar_open, |button| button.bg(rgb(t.overlay)))
                    .on_click(cx.listener(|this, _, window, cx| this.toggle_sidebar(window, cx))),
            )
            .child(div().flex().items_center().gap_2().pr_2().child(mode).child(dot()).child(seed).child(dot()).child(self.guesses_status()))
    }
}

/// A small square button around an icon.
fn icon_button(t: &Theme, id: impl Into<SharedString>, icon: Div) -> Stateful<Div> {
    let overlay = t.overlay;
    div()
        .id(id.into())
        .flex()
        .items_center()
        .justify_center()
        .size(px(22.))
        .rounded_md()
        .cursor_pointer()
        .hover(move |style| style.bg(rgb(overlay)))
        .child(icon)
}

/// A window outline with its left column filled in while the sidebar is open.
fn sidebar_icon(t: &Theme, open: bool) -> Div {
    let colour = if open { t.text } else { t.subtle };
    div()
        .flex()
        .w(px(14.))
        .h(px(12.))
        .rounded_sm()
        .border_1()
        .border_color(rgb(colour))
        .child(div().w(px(4.)).h_full().border_r_1().border_color(rgb(colour)).when(open, |column| column.bg(rgb(colour))))
}

/// Two overlapping sheets.
fn copy_icon(t: &Theme) -> Div {
    let sheet = || div().absolute().size(px(8.)).rounded(px(1.5)).border_1().border_color(rgb(t.subtle));
    div().relative().size(px(11.)).child(sheet().top_0().left_0()).child(sheet().bottom_0().right_0().bg(rgb(t.surface)))
}

