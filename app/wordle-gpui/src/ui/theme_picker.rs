//! The theme picker, floating near the top of the window like Zed's: a search field, then the
//! matching themes. Its state and keys are in `theme/picker.rs`.

use gpui::{Context, SharedString, div, prelude::*, px, rgb};

use super::WordleApp;
use super::widgets::{panel, query_field};
use crate::theme::picker::ThemePicker;

impl WordleApp {
    pub(super) fn render_theme_picker(&self, picker: &ThemePicker, cx: &mut Context<Self>) -> impl IntoElement {
        let t = self.theme;
        let matches = picker.matches();

        let mut list = div().flex().flex_col().p_1();
        for (index, theme) in matches.iter().copied().enumerate() {
            list = list.child(
                div()
                    .id(SharedString::from(format!("theme-{index}")))
                    .flex()
                    .justify_between()
                    .px_2()
                    .py_1()
                    .rounded_md()
                    .cursor_pointer()
                    .text_sm()
                    .when(index == picker.selected, |row| row.bg(rgb(t.overlay)))
                    .hover(|style| style.bg(rgb(t.overlay)))
                    .on_click(cx.listener(move |this, _, _, cx| {
                        this.theme = theme;
                        this.overlay = None;
                        cx.notify();
                    }))
                    .child(div().text_color(rgb(t.text)).child(theme.name))
                    .child(div().text_color(rgb(t.muted)).child(theme.appearance())),
            );
        }
        if matches.is_empty() {
            list = list.child(div().px_2().py_1().text_sm().text_color(rgb(t.muted)).child("No matching themes"));
        }

        div()
            .absolute()
            .top(px(56.))
            .left_0()
            .right_0()
            .flex()
            .justify_center()
            .child(panel(t, "theme-picker").w(px(360.)).child(query_field(t, &picker.query, "Select a theme…")).child(list))
    }
}
