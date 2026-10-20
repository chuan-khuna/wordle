//! The "Precompute guess counts…" picker, in the middle of the window: the thread count and the
//! Strategies to compute; and, while a run goes on, the offer to stop it. Their state and keys are
//! in `overlays/guess_counts.rs`.

use gpui::{Context, SharedString, div, prelude::*, px, rgb};

use super::WordleApp;
use super::widgets::{self, panel};
use crate::overlays::guess_counts::{GuessCountPicker, Outcome};
use crate::overlays::precompute::threads_label;
use wordle_gpui::solver::matrix::THREAD_CHOICES;
use wordle_gpui::solver::strategy::STRATEGIES;

impl WordleApp {
    pub(super) fn render_guess_counts_picker(&self, picker: &GuessCountPicker, cx: &mut Context<Self>) -> impl IntoElement {
        let t = self.theme;
        let mut threads = div().flex().gap_1().px_3().py_1();
        for (index, count) in THREAD_CHOICES.into_iter().enumerate() {
            let selected = index == picker.threads.selected;
            threads = threads.child(
                div()
                    .id(SharedString::from(format!("guess-count-threads-{count}")))
                    .px_2()
                    .py_0p5()
                    .rounded_md()
                    .cursor_pointer()
                    .text_xs()
                    .text_color(rgb(if selected { t.text } else { t.subtle }))
                    .when(selected, |chip| chip.bg(rgb(t.overlay)))
                    .hover(|style| style.bg(rgb(t.overlay)))
                    .on_click(cx.listener(move |this, _, _, cx| {
                        if let Some(super::Overlay::GuessCounts(picker)) = this.overlay.as_mut() {
                            picker.threads.selected = index;
                        }
                        cx.notify();
                    }))
                    .child(threads_label(count)),
            );
        }

        let mut list = div().flex().flex_col().p_1();
        for (index, strategy) in STRATEGIES.iter().enumerate() {
            let on = picker.chosen[index];
            list = list.child(
                div()
                    .id(SharedString::from(format!("guess-count-{}", strategy.id)))
                    .flex()
                    .items_center()
                    .gap_2()
                    .px_2()
                    .py_1()
                    .rounded_md()
                    .cursor_pointer()
                    .when(index == picker.cursor, |row| row.bg(rgb(t.overlay)))
                    .hover(|style| style.bg(rgb(t.overlay)))
                    .on_click(cx.listener(move |this, _, _, cx| {
                        if let Some(super::Overlay::GuessCounts(picker)) = this.overlay.as_mut() {
                            picker.toggle(index);
                        }
                        cx.notify();
                    }))
                    .child(
                        div()
                            .size(px(12.))
                            .rounded_sm()
                            .border_1()
                            .border_color(rgb(t.highlight_med))
                            .flex()
                            .items_center()
                            .justify_center()
                            .when(on, |box_| box_.child(div().size(px(6.)).rounded_sm().bg(rgb(t.success)))),
                    )
                    .child(div().flex().flex_col().child(div().text_sm().text_color(rgb(t.text)).child(strategy.id)).child(div().text_xs().text_color(rgb(t.muted)).child(strategy.name))),
            );
        }

        let start = widgets::button(t, "guess-counts-start", "Start").on_click(cx.listener(|this, _, _, cx| {
            if let Some(super::Overlay::GuessCounts(picker)) = this.overlay.as_ref()
                && let Outcome::Run { threads, strategies } = picker.run()
            {
                this.start_guess_counts(threads, strategies, cx);
            }
        }));

        div().absolute().inset_0().flex().items_center().justify_center().child(
            panel(t, "guess-counts-picker").w(px(400.)).child(
                div()
                    .flex()
                    .flex_col()
                    .child(div().px_3().pt_2().text_sm().text_color(rgb(t.text)).child("Precompute guess counts"))
                    .child(
                        div()
                            .px_3()
                            .pb_1()
                            .text_xs()
                            .text_color(rgb(t.muted))
                            .child("Unfinished rows are filled; finished ones are kept · Space toggles · ← → threads · Enter to start · Esc to go back"),
                    )
                    .child(threads)
                    .child(list)
                    .child(div().flex().justify_end().px_3().pb_2().child(start)),
            ),
        )
    }

    pub(super) fn render_stop_guess_counts(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let t = self.theme;
        let note = self.guess_counts.as_ref().map(|run| run.note()).unwrap_or_default();
        div().absolute().inset_0().flex().items_center().justify_center().child(
            panel(t, "stop-guess-counts").w(px(400.)).child(
                div()
                    .flex()
                    .flex_col()
                    .gap_1()
                    .px_3()
                    .py_2()
                    .child(div().text_sm().text_color(rgb(t.text)).child("Stop precomputing guess counts?"))
                    .child(div().text_xs().text_color(rgb(t.muted)).child(note))
                    .child(div().text_xs().text_color(rgb(t.muted)).child("Finished rows are kept; run it again to resume · Enter to stop · Esc to keep going"))
                    .child(
                        div()
                            .flex()
                            .justify_end()
                            .gap_2()
                            .pt_1()
                            .child(widgets::button(t, "guess-counts-keep-going", "Keep going").on_click(cx.listener(|this, _, _, cx| this.dismiss(cx))))
                            .child(widgets::button(t, "guess-counts-stop", "Stop").on_click(cx.listener(|this, _, _, cx| this.stop_guess_counts(cx)))),
                    ),
            ),
        )
    }
}
