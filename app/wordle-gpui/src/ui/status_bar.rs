//! The bar along the bottom of the window, like Zed's: the sidebar button on the left; the Guess
//! Limit, the Seed (with a button that copies it) and the Guesses left on the right.

use gpui::{Context, Pixels, div, prelude::*, px, rgb};

use super::widgets::{self, IconName};
use super::WordleApp;
use crate::overlays::commands::{Command, group_digits};

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
                .child(format!("seed {}", group_digits(&seed.to_string())))
                .child(widgets::icon_button(t, "copy-seed", widgets::icon(IconName::Copy, t.subtle)).on_click(cx.listener(|this, _, window, cx| this.run(Command::CopySeed, window, cx)))),
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
            .bg(rgb(t.background))
            .text_xs()
            .text_color(rgb(t.subtle))
            .child(
                div()
                    .flex()
                    .items_center()
                    .gap_2()
                    .child(
                        widgets::icon_button(t, "toggle-sidebar", widgets::icon(IconName::PanelLeft, if self.sidebar_open { t.text } else { t.subtle }))
                            .when(self.sidebar_open, |button| button.bg(rgb(t.overlay)))
                            .on_click(cx.listener(|this, _, window, cx| this.toggle_sidebar(window, cx))),
                    )
                    .when_some(self.status.clone(), |left, note| left.child(div().text_color(rgb(t.text)).child(note))),
            )
            .child(
                div()
                    .flex()
                    .items_center()
                    .gap_2()
                    .child(mode)
                    .child(dot())
                    .child(seed)
                    .child(dot())
                    .child(self.guesses_status())
                    .child(
                        widgets::icon_button(t, "toggle-solver", widgets::icon(IconName::PanelRight, if self.solver.open { t.text } else { t.subtle }))
                            .when(self.solver.open, |button| button.bg(rgb(t.overlay)))
                            .on_click(cx.listener(|this, _, window, cx| this.toggle_solver(window, cx))),
                    ),
            )
    }
}

