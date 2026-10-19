//! Small pieces shared by the menu, the command palette and the theme picker.

use gpui::{Div, ElementId, SharedString, Stateful, div, prelude::*, px, rgb};
use gpui_base::Button;

use crate::theme::Theme;

/// A floating box: the settings menu, the command palette, the theme picker.
pub fn panel(t: &Theme, id: &'static str) -> Stateful<Div> {
    div()
        .id(id)
        .occlude()
        .flex()
        .flex_col()
        .rounded_lg()
        .bg(rgb(t.surface))
        .border_1()
        .border_color(rgb(t.highlight_med))
        .shadow_lg()
}

/// The text field along the top of the palette and the picker: what's typed (or a dim placeholder), then a caret.
pub fn query_field(t: &Theme, text: &str, placeholder: &str) -> Div {
    let text = if text.is_empty() {
        div().text_color(rgb(t.muted)).child(placeholder.to_string())
    } else {
        div().text_color(rgb(t.text)).child(text.to_string())
    };
    div()
        .flex()
        .items_center()
        .h(px(36.))
        .px_3()
        .border_b_1()
        .border_color(rgb(t.overlay))
        .text_sm()
        .child(text)
        .child(caret(t))
}

pub fn caret(t: &Theme) -> Div {
    div().w(px(1.5)).h(px(14.)).ml(px(1.)).bg(rgb(t.accent))
}

/// A thin line between groups of menu rows.
pub fn separator(t: &Theme) -> Div {
    div().my_1().h(px(1.)).bg(rgb(t.overlay))
}

/// A row of a menu or list: a label, a dimmer hint under it, and room on the right for a check or a shortcut.
pub fn menu_item(t: &Theme, id: impl Into<ElementId>, label: &'static str, hint: impl Into<SharedString>) -> Stateful<Div> {
    let overlay = t.overlay;
    div()
        .id(id)
        .flex()
        .items_center()
        .justify_between()
        .px_2()
        .py_1()
        .rounded_md()
        .cursor_pointer()
        .hover(move |style| style.bg(rgb(overlay)))
        .child(
            div()
                .flex()
                .flex_col()
                .child(div().text_sm().text_color(rgb(t.text)).child(label))
                .child(div().text_xs().text_color(rgb(t.muted)).child(hint.into())),
        )
}

/// A bordered button. The kit's `Button` is unstyled, so the theme's colours are applied here.
/// It doesn't take keyboard focus, so typing keeps going to the board after a click.
pub fn button(t: &Theme, id: impl Into<ElementId>, label: impl Into<SharedString>) -> Button {
    let hover = t.highlight_high;
    Button::new(id)
        .focusable(false)
        .tab_stop(false)
        .px_3()
        .py_1p5()
        .rounded_md()
        .bg(rgb(t.overlay))
        .border_1()
        .border_color(rgb(t.highlight_med))
        .text_color(rgb(t.text))
        .text_sm()
        .cursor_pointer()
        .hover(move |style| style.bg(rgb(hover)))
        .child(label.into())
}

/// A smaller `button`, for actions that sit inside a line of text.
pub fn small_button(t: &Theme, id: impl Into<ElementId>, label: impl Into<SharedString>) -> Button {
    button(t, id, label).px_2().py_0p5().text_xs()
}

/// A monospace font for commands and code, by platform (gpui falls back if it's missing).
pub const MONO_FONT: &str = if cfg!(target_os = "macos") {
    "Menlo"
} else if cfg!(target_os = "windows") {
    "Consolas"
} else {
    "monospace"
};

/// A small square button around an icon.
pub fn icon_button(t: &Theme, id: impl Into<ElementId>, icon: Div) -> Button {
    let overlay = t.overlay;
    Button::new(id)
        .focusable(false)
        .tab_stop(false)
        .flex()
        .items_center()
        .justify_center()
        .size(px(22.))
        .rounded_md()
        .cursor_pointer()
        .hover(move |style| style.bg(rgb(overlay)))
        .child(icon)
}

/// Two overlapping sheets.
pub fn copy_icon(t: &Theme) -> Div {
    let sheet = || div().absolute().size(px(8.)).rounded(px(1.5)).border_1().border_color(rgb(t.subtle));
    div().relative().size(px(11.)).child(sheet().top_0().left_0()).child(sheet().bottom_0().right_0().bg(rgb(t.surface)))
}

/// An eye, open (a pupil in an outline) or closed (just the lower lid).
pub fn eye_icon(t: &Theme, open: bool) -> Div {
    let eye = div().flex().items_center().justify_center().w(px(15.)).h(px(9.)).border_color(rgb(t.subtle));
    if open {
        eye.rounded_full().border_1().child(div().size(px(4.)).rounded_full().bg(rgb(t.subtle)))
    } else {
        eye.rounded_b_full().border_b_1().border_l_1().border_r_1()
    }
}
