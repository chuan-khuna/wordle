//! The hamburger in the title bar and the settings menu that hangs from it. Its rows are
//! `Command`s, drawn by `command_row`, which the command palette uses too.

use gpui::{Anchor, AnyElement, Context, Div, ElementId, FontWeight, SharedString, Stateful, anchored, deferred, div, prelude::*, px, rgb};

use super::widgets::{caret, menu_item, panel, separator, small_button};
use super::{Overlay, PALETTE_SHORTCUT, SIDEBAR_SHORTCUT, THEME_PICKER_SHORTCUT, WordleApp};
use crate::commands::{Command, SeedField};
use crate::theme::Theme;

impl WordleApp {
    /// The dim line under a command's label.
    fn hint(&self, command: Command) -> SharedString {
        match command {
            Command::Reset => "A new random Answer".into(),
            Command::Restart => match self.game.seed {
                Some(seed) => format!("Same Answer, seed {seed}").into(),
                None => "Same Answer".into(),
            },
            Command::PlaySeed => "Replay any Answer by its Seed".into(),
            Command::CopySeed => match self.game.seed {
                Some(seed) => format!("{seed}, to the clipboard").into(),
                None => "No Seed: the Answer was chosen".into(),
            },
            Command::ToggleUnlimited => "Starts a new word".into(),
            Command::ToggleLiveHints => "Colour typed letters by earlier Guesses".into(),
            Command::ToggleSidebar => format!("Guesses and their meanings · {}", SIDEBAR_SHORTCUT.label()).into(),
            Command::ChangeTheme => self.theme.name.into(),
        }
    }

    /// A command as a row: its label, its hint, and a check (for a toggle) or a shortcut (Change theme…) on the right.
    pub(super) fn command_row(&self, command: Command, id: impl Into<ElementId>) -> Stateful<Div> {
        let t = self.theme;
        let row = menu_item(t, id, command.label(), self.hint(command));
        match command {
            Command::ToggleUnlimited => row.child(check(t, self.game.is_unlimited())),
            Command::ToggleLiveHints => row.child(check(t, self.live_hints)),
            Command::ToggleSidebar => row.child(check(t, self.sidebar_open)),
            Command::ChangeTheme => row.child(div().text_xs().text_color(rgb(t.muted)).child(THEME_PICKER_SHORTCUT.label())),
            _ => row,
        }
    }

    /// The hamburger, with the settings menu hanging from its bottom-right corner.
    pub(super) fn render_menu_button(&self, cx: &mut Context<Self>) -> AnyElement {
        let overlay = self.theme.overlay;
        let menu_seed = match &self.overlay {
            Some(Overlay::Menu { seed }) => Some(seed.as_ref()),
            _ => None,
        };
        let bars = div()
            .flex()
            .flex_col()
            .gap(px(3.))
            .children((0..3).map(|_| div().w(px(14.)).h(px(2.)).rounded_sm().bg(rgb(self.theme.subtle))));

        div()
            .relative()
            .child(
                div()
                    .id("settings")
                    .flex()
                    .items_center()
                    .justify_center()
                    .size(px(26.))
                    .rounded_md()
                    .cursor_pointer()
                    .occlude()
                    .when(menu_seed.is_some(), |button| button.bg(rgb(overlay)))
                    .hover(move |style| style.bg(rgb(overlay)))
                    .on_click(cx.listener(|this, _, window, cx| {
                        window.focus(&this.focus_handle, cx);
                        this.toggle_menu(cx);
                    }))
                    .child(bars),
            )
            .when_some(menu_seed, |container, seed| {
                container.child(
                    div()
                        .absolute()
                        .top_full()
                        .right_0()
                        .child(deferred(anchored().anchor(Anchor::TopRight).snap_to_window().child(self.render_menu(seed, cx)))),
                )
            })
            .into_any_element()
    }

    fn render_menu(&self, seed: Option<&SeedField>, cx: &mut Context<Self>) -> impl IntoElement {
        let t = self.theme;
        let mut menu = panel(t, "settings-menu").mt_1().w(px(220.)).p_1();
        for (index, command) in Command::ALL.into_iter().enumerate() {
            if index > 0 && Command::ALL[index - 1].group() != command.group() {
                menu = menu.child(separator(t));
            }
            menu = match (command, seed) {
                (Command::PlaySeed, Some(field)) => menu.child(seed_field(t, field, cx)),
                _ => menu.child(
                    self.command_row(command, SharedString::from(format!("menu-{index}")))
                        .on_click(cx.listener(move |this, _, window, cx| this.run(command, window, cx))),
                ),
            };
        }
        menu.child(separator(t)).child(
            div()
                .flex()
                .justify_between()
                .px_2()
                .py_1()
                .text_xs()
                .text_color(rgb(t.muted))
                .child("Command palette")
                .child(PALETTE_SHORTCUT.label()),
        )
    }
}

fn check(t: &Theme, on: bool) -> impl IntoElement {
    div().w(px(16.)).text_color(rgb(t.success)).font_weight(FontWeight::BOLD).when(on, |check| check.child("✓"))
}

/// The seed field that replaces "Play a seed…" in the menu: the digits typed so far and a caret.
fn seed_field(t: &Theme, field: &SeedField, cx: &mut Context<WordleApp>) -> impl IntoElement {
    div()
        .flex()
        .flex_col()
        .gap_1()
        .px_2()
        .py_1()
        .child(
            div()
                .flex()
                .items_center()
                .justify_between()
                .child(div().text_sm().text_color(rgb(t.text)).child("Play a seed"))
                .child(paste_seed_button(t, cx)),
        )
        .child(
            div()
                .flex()
                .items_center()
                .h(px(28.))
                .px_2()
                .rounded_md()
                .bg(rgb(t.background))
                .border_1()
                .border_color(rgb(t.accent))
                .text_sm()
                .text_color(rgb(t.text))
                .child(field.digits.clone())
                .child(caret(t)),
        )
        .child(div().text_xs().text_color(rgb(t.muted)).child(field.hint()))
}


/// Fills the seed field from the clipboard (its digits, as `SeedField::paste` keeps them).
pub(super) fn paste_seed_button(t: &Theme, cx: &mut Context<WordleApp>) -> impl IntoElement {
    small_button(t, "paste-seed", "Paste seed").on_click(cx.listener(|this, _, _, cx| this.paste(cx)))
}
