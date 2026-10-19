//! Small pieces shared by the menu, the command palette and the theme picker.

use gpui::{Div, ElementId, SharedString, Stateful, div, prelude::*, px, rgb};

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

pub fn button(t: &Theme, id: &'static str, label: &'static str) -> Stateful<Div> {
    let hover = t.highlight_high;
    div()
        .id(id)
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
        .child(label)
}
