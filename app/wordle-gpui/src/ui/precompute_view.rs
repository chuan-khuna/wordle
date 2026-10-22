//! The precompute view: while **Precompute matrices…**, **Precompute guess counts…** or
//! **Precompute benchmark** runs, and after it ends until the player goes back, it takes the board's
//! island. An overall bar with the rate and the time left, a line per matrix, Strategy or the
//! Benchmark, and the log, newest at the bottom. Its
//! state is in `overlays/precompute_run.rs`; the game underneath is left as it was.

use gpui::{Div, FontWeight, HighlightStyle, ScrollStrategy, StyledText, div, prelude::*, px, relative, rgb, uniform_list};

use super::WordleApp;
use super::widgets::{self, MONO_FONT};
use crate::overlays::precompute_run::{self, End, MAX_LOG_LINES, Phase, Span, Tone};
use crate::overlays::guess_counts::with_commas;
use crate::theme::Theme;

/// The height of one log line, which `uniform_list` needs to draw only the lines in view.
const LOG_LINE_HEIGHT: f32 = 18.;

impl WordleApp {
    /// Before drawing: if lines came since the last draw and the log was at its end, keep it there.
    pub(super) fn follow_precompute_log(&mut self) {
        let Some(run) = self.precompute.as_mut() else {
            return;
        };
        let lines = {
            let state = run.state.lock().expect("the precompute state lock");
            state.log().len() + state.dropped()
        };
        if lines != run.lines_seen {
            if run.log_scroll.is_scrolled_to_end() != Some(false) || run.lines_seen == 0 {
                run.log_scroll.scroll_to_item(usize::MAX, ScrollStrategy::Bottom);
            }
            run.lines_seen = lines;
        }
    }

    pub(super) fn render_precompute_view(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let t = self.theme;
        let run = self.precompute.as_ref().expect("the view shows only with a run");
        let now = run.started.elapsed();
        let state = run.state();

        let status = match (state.end, state.stop_asked) {
            (None, false) => ("running", t.accent),
            (None, true) => ("stopping…", t.present.0),
            (Some((End::Finished, _)), _) => ("finished", t.success),
            (Some((End::Stopped, _)), _) => ("stopped", t.present.0),
            (Some((End::Failed, _)), _) => ("failed", t.error),
        };
        let button = if state.can_stop() {
            Some(widgets::button(t, "precompute-stop", "Stop").on_click(cx.listener(|this, _, _, cx| this.stop_guess_counts(cx))))
        } else if !state.is_running() {
            Some(widgets::button(t, "precompute-back", "Back to game").on_click(cx.listener(|this, _, _, cx| this.back_to_game(cx))))
        } else {
            None
        };
        let header = div()
            .flex()
            .items_center()
            .justify_between()
            .child(
                div()
                    .flex()
                    .items_baseline()
                    .gap_3()
                    .child(div().text_xl().font_weight(FontWeight::BOLD).text_color(rgb(t.heading)).child(state.title()))
                    .child(div().text_sm().text_color(rgb(status.1)).child(status.0)),
            )
            .children(button);

        let fill = match state.end {
            Some((End::Failed, _)) => t.error,
            Some((End::Stopped, _)) => t.present.0,
            _ => t.correct.0,
        };
        let overall = div()
            .flex()
            .flex_col()
            .gap_1()
            .child(bar(t, state.fraction(), fill, 14.))
            .child(div().text_sm().text_color(rgb(t.text)).child(state.progress_line(now)));

        let mut items = div().flex().flex_col().gap_2();
        for item in &state.items {
            let fraction = if item.total == 0 { 0.0 } else { item.done as f32 / item.total as f32 };
            let colour = match item.phase {
                Phase::Running => t.accent,
                Phase::Finished => t.success,
                Phase::Stopped => t.present.0,
                Phase::Failed => t.error,
                Phase::Waiting | Phase::NotStarted => t.muted,
            };
            items = items.child(
                div()
                    .flex()
                    .flex_col()
                    .gap_0p5()
                    .child(
                        div()
                            .flex()
                            .items_baseline()
                            .justify_between()
                            .gap_2()
                            .child(
                                div()
                                    .flex()
                                    .items_baseline()
                                    .gap_2()
                                    .min_w_0()
                                    .child(div().font_family(MONO_FONT).text_sm().text_color(rgb(t.text)).child(item.id.clone()))
                                    .child(div().text_xs().text_color(rgb(t.muted)).truncate().child(item.detail.clone())),
                            )
                            .child(
                                div()
                                    .flex()
                                    .flex_none()
                                    .gap_2()
                                    .text_xs()
                                    .child(div().text_color(rgb(t.text)).child(format!("{} / {}", with_commas(item.done), with_commas(item.total))))
                                    .child(div().w(px(72.)).text_right().text_color(rgb(colour)).child(item.phase.label())),
                            ),
                    )
                    .child(bar(t, fraction, if item.phase == Phase::Failed { t.error } else { t.subtle }, 6.)),
            );
        }

        let log_heading = div()
            .flex()
            .items_baseline()
            .justify_between()
            .child(div().text_xs().font_weight(FontWeight::BOLD).text_color(rgb(t.muted)).child("LOG"))
            .when(state.dropped() > 0, |heading| {
                heading.child(div().text_xs().text_color(rgb(t.muted)).child(format!("{} earlier lines dropped: the log keeps the last {}", with_commas(state.dropped()), with_commas(MAX_LOG_LINES))))
            });
        let count = state.log().len();
        drop(state);
        let shared = run.state.clone();
        let log = uniform_list("precompute-log", count, move |range, _, _| {
            let state = shared.lock().expect("the precompute state lock");
            range.filter_map(|index| state.log().get(index)).map(|line| log_line(t, line)).collect::<Vec<_>>()
        })
        .track_scroll(&run.log_scroll)
        .flex_1()
        .min_h_0()
        .px_2()
        .py_1()
        .rounded_md()
        .bg(rgb(t.background));

        div()
            .flex_1()
            .min_h(px(770.))
            .min_w(px(440.))
            .rounded_xl()
            .bg(rgb(t.surface))
            .flex()
            .flex_col()
            .gap_4()
            .p_4()
            .child(header)
            .child(overall)
            .child(items)
            .child(div().flex().flex_col().flex_1().min_h_0().gap_1().child(log_heading).child(log))
            .on_mouse_down(gpui::MouseButton::Left, cx.listener(|this, _, _, cx| this.leave_solver_search(cx)))
    }
}

/// A rounded track with `fraction` of it filled.
fn bar(t: &Theme, fraction: f32, fill: u32, height: f32) -> Div {
    div()
        .w_full()
        .h(px(height))
        .rounded_sm()
        .bg(rgb(t.overlay))
        .when(fraction > 0.0, |track| track.child(div().h_full().w(relative(fraction.min(1.0))).min_w(px(2.)).rounded_sm().bg(rgb(fill))))
}

/// One log line: its time since the run started, then the text in its tone's colour.
fn log_line(t: &'static Theme, line: &precompute_run::LogLine) -> Div {
    let colour = match line.tone {
        Tone::Info => t.text,
        Tone::Row => t.subtle,
        Tone::Success => t.success,
        Tone::Warning => t.present.0,
        Tone::Error => t.error,
    };
    div()
        .h(px(LOG_LINE_HEIGHT))
        .flex()
        .items_center()
        .gap_2()
        .font_family(MONO_FONT)
        .text_xs()
        .child(div().flex_none().text_color(rgb(t.muted)).child(precompute_run::clock(line.at)))
        .child(div().text_color(rgb(colour)).truncate().child(coloured(t, line)))
}

/// The line's text with its Strategy ids, Openers, numbers and paths in colours of their own. An
/// error keeps its one colour, so it reads as a whole.
fn coloured(t: &Theme, line: &precompute_run::LogLine) -> StyledText {
    let text = StyledText::new(line.text.clone());
    if line.tone == Tone::Error {
        return text;
    }
    text.with_highlights(precompute_run::highlights(&line.text).into_iter().map(|(range, span)| {
        let (colour, weight) = match span {
            Span::Strategy => (t.accent, None),
            Span::Opener => (t.correct.0, Some(FontWeight::BOLD)),
            Span::Number => (t.present.0, None),
            Span::Path => (t.muted, None),
        };
        (range, HighlightStyle { color: Some(rgb(colour).into()), font_weight: weight, ..Default::default() })
    }))
}
