//! Small pieces shared by the menu, the command palette and the theme picker.

use gpui::{Div, ElementId, SharedString, Stateful, Svg, div, prelude::*, px, rgb, svg};
use gpui_base::Button;
use gpui_component::kbd::Kbd;

use super::Shortcut;
pub use gpui_kit_assets::IconName;

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

/// A row of a menu or list: the label on the left, and `right` (a detail, a check, a shortcut) on the right.
pub fn menu_item(t: &Theme, id: impl Into<ElementId>, label: &'static str, right: impl IntoElement) -> Stateful<Div> {
    let overlay = t.overlay;
    div()
        .id(id)
        .flex()
        .items_center()
        .justify_between()
        .gap_4()
        .h(px(30.))
        .px_2()
        .rounded_md()
        .cursor_pointer()
        .hover(move |style| style.bg(rgb(overlay)))
        .child(div().text_sm().text_color(rgb(t.text)).child(label))
        .child(right)
}

/// A shortcut as the kit's `Kbd` keys, one for each key press of a chord, in the theme's colours.
pub fn shortcut(t: &Theme, shortcut: &Shortcut) -> Div {
    div().flex().items_center().gap_1().children(shortcut.keystrokes().into_iter().map(|stroke| {
        Kbd::new(stroke).text_color(rgb(t.subtle)).bg(rgb(t.overlay)).border_1().border_color(rgb(t.highlight_med)).rounded_sm()
    }))
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

/// A monospace font for commands and code, by platform (gpui falls back if it's missing).
pub const MONO_FONT: &str = if cfg!(target_os = "macos") {
    "Menlo"
} else if cfg!(target_os = "windows") {
    "Consolas"
} else {
    "monospace"
};

/// A small square button around an icon.
pub fn icon_button(t: &Theme, id: impl Into<ElementId>, icon: impl IntoElement) -> Button {
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

/// One of the kit's icons, in `colour`.
pub fn icon(name: IconName, colour: u32) -> Svg {
    svg().path(name.path()).size(px(14.)).flex_none().text_color(rgb(colour))
}
