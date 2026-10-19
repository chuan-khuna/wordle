//! A Zed-style title bar drawn by the app. On macOS the system title bar is made
//! transparent and the traffic lights sit on top of this bar; macOS still drags the
//! window by it. On Windows the bar draws its own caption buttons and tells the
//! system which areas drag, minimise, maximise and close. Linux keeps its system title bar.

use gpui::{
    AnyElement, ClickEvent, FontWeight, Pixels, Point, SharedString, TitlebarOptions, Window,
    WindowControlArea, div, point, prelude::*, px, rgb,
};

use crate::theme;

const HEIGHT: Pixels = px(34.);
/// Room on the left for the macOS traffic lights.
const TRAFFIC_LIGHTS_WIDTH: Pixels = px(88.);
const TRAFFIC_LIGHTS_POSITION: Point<Pixels> = point(px(12.), px(11.));

pub fn options() -> TitlebarOptions {
    TitlebarOptions {
        title: Some("Wordle".into()),
        appears_transparent: true,
        traffic_light_position: Some(TRAFFIC_LIGHTS_POSITION),
    }
}

/// The bar: the app's name, then `crumbs` (dimmer, like Zed's project and branch).
pub fn render(crumbs: Vec<SharedString>, window: &Window) -> impl IntoElement {
    let background = if window.is_window_active() { theme::SURFACE } else { theme::BASE };
    let left_padding = if cfg!(target_os = "macos") { TRAFFIC_LIGHTS_WIDTH } else { px(12.) };

    let mut title = div()
        .flex()
        .items_center()
        .gap_2()
        .text_sm()
        .child(div().text_color(rgb(theme::TEXT)).font_weight(FontWeight::SEMIBOLD).child("wordle"));
    for crumb in crumbs {
        title = title.child(div().text_color(rgb(theme::MUTED)).child("/")).child(div().text_color(rgb(theme::SUBTLE)).child(crumb));
    }

    div()
        .id("title-bar")
        .flex()
        .flex_none()
        .items_center()
        .justify_between()
        .w_full()
        .h(HEIGHT)
        .pl(left_padding)
        .bg(rgb(background))
        .border_b_1()
        .border_color(rgb(theme::OVERLAY))
        .window_control_area(WindowControlArea::Drag)
        .on_click(|event: &ClickEvent, window, _| {
            if event.click_count() == 2 {
                if cfg!(target_os = "macos") { window.titlebar_double_click() } else { window.zoom_window() }
            }
        })
        .child(title)
        .when(cfg!(target_os = "windows"), |bar| bar.child(caption_buttons(window)))
}

/// Minimise, maximise (or restore) and close, drawn with the Segoe icon fonts like Zed does.
fn caption_buttons(window: &Window) -> AnyElement {
    let maximise = if window.is_maximized() { "\u{e923}" } else { "\u{e922}" };
    div()
        .flex()
        .h_full()
        .child(caption_button("minimise", "\u{e921}", WindowControlArea::Min, theme::HIGHLIGHT_MED))
        .child(caption_button("maximise", maximise, WindowControlArea::Max, theme::HIGHLIGHT_MED))
        .child(caption_button("close", "\u{e8bb}", WindowControlArea::Close, theme::LOVE))
        .into_any_element()
}

fn caption_button(id: &'static str, icon: &'static str, area: WindowControlArea, hover: u32) -> impl IntoElement {
    div()
        .id(id)
        .flex()
        .items_center()
        .justify_center()
        .w(px(46.))
        .h_full()
        .font_family("Segoe Fluent Icons")
        .text_size(px(10.))
        .text_color(rgb(theme::SUBTLE))
        .window_control_area(area)
        .hover(move |style| style.bg(rgb(hover)).text_color(rgb(theme::TEXT)))
        .child(icon)
}
