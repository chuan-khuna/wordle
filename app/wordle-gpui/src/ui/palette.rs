//! The command palette, in the middle of the window: a search field, then the matching commands,
//! or a seed field after "Play a seed…". Its state and keys are in `commands.rs`.

use gpui::{Context, SharedString, div, prelude::*, px, rgb};

use super::WordleApp;
use super::widgets::{panel, query_field};
use crate::commands::CommandPalette;

impl WordleApp {
    pub(super) fn render_palette(&self, palette: &CommandPalette, cx: &mut Context<Self>) -> impl IntoElement {
        let t = self.theme;
        let mut body = div().flex().flex_col().p_1();
        let field = match &palette.seed {
            Some(seed) => {
                body = body.child(div().px_2().py_1().text_xs().text_color(rgb(t.muted)).child(seed.hint()));
                query_field(t, &seed.digits, "Seed to play…")
            }
            None => {
                let matches = palette.matches();
                for (index, command) in matches.iter().copied().enumerate() {
                    body = body.child(
                        self.command_row(command, SharedString::from(format!("palette-{index}")))
                            .when(index == palette.selected, |row| row.bg(rgb(t.overlay)))
                            .on_click(cx.listener(move |this, _, window, cx| this.choose_in_palette(command, window, cx))),
                    );
                }
                if matches.is_empty() {
                    body = body.child(div().px_2().py_1().text_sm().text_color(rgb(t.muted)).child("No matching commands"));
                }
                query_field(t, &palette.query, "Type a command…")
            }
        };

        div()
            .absolute()
            .inset_0()
            .flex()
            .items_center()
            .justify_center()
            .child(panel(t, "command-palette").w(px(360.)).child(field).child(body))
    }
}
