//! The "Precompute matrices…" picker, in the middle of the window: how many threads to score the
//! Feedback matrices with. Its state and keys are in `overlays/precompute.rs`.

use gpui::{Context, SharedString, div, prelude::*, px, rgb};

use super::WordleApp;
use super::widgets::panel;
use crate::overlays::precompute::{ThreadPicker, threads_label};
use wordle_gpui::solver::matrix::THREAD_CHOICES;

impl WordleApp {
    pub(super) fn render_precompute_picker(&self, picker: &ThreadPicker, cx: &mut Context<Self>) -> impl IntoElement {
        let t = self.theme;
        let mut list = div().flex().flex_col().p_1();
        for (index, threads) in THREAD_CHOICES.into_iter().enumerate() {
            list = list.child(
                div()
                    .id(SharedString::from(format!("threads-{threads}")))
                    .flex()
                    .px_2()
                    .py_1()
                    .rounded_md()
                    .cursor_pointer()
                    .text_sm()
                    .text_color(rgb(t.text))
                    .when(index == picker.selected, |row| row.bg(rgb(t.overlay)))
                    .hover(|style| style.bg(rgb(t.overlay)))
                    .on_click(cx.listener(move |this, _, _, cx| this.start_precompute(threads, cx)))
                    .child(threads_label(threads)),
            );
        }

        div().absolute().inset_0().flex().items_center().justify_center().child(
            panel(t, "precompute-picker").w(px(360.)).child(
                div()
                    .flex()
                    .flex_col()
                    .child(div().px_3().pt_2().text_sm().text_color(rgb(t.text)).child("Precompute the Feedback matrices"))
                    .child(div().px_3().pb_1().text_xs().text_color(rgb(t.muted)).child("Pick the threads to score with · Enter to start · Esc to go back"))
                    .child(list),
            ),
        )
    }
}
