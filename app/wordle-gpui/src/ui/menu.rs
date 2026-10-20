//! The hamburger in the title bar and the settings menu that hangs from it. Its rows are
//! `Command`s, drawn by `command_row`, which the command palette uses too.

use gpui::{Anchor, AnyElement, Context, Div, ElementId, SharedString, Stateful, anchored, deferred, div, prelude::*, px, rgb};

use super::widgets::{self, caret, menu_item, panel, separator};
use super::{Overlay, PALETTE_SHORTCUT, SIDEBAR_SHORTCUT, SOLVER_SHORTCUT, THEME_PICKER_SHORTCUT, WordleApp};
use crate::overlays::commands::{Command, SeedField, group_digits};
use crate::theme::Theme;

impl WordleApp {
    /// The dim detail at the right of a command's row, if it has one.
    fn detail(&self, command: Command) -> Option<SharedString> {
        match command {
            Command::Restart => self.game.seed.map(|seed| format!("seed {}", group_digits(&seed.to_string())).into()),
            Command::CopySeed => self.game.seed.map(|seed| group_digits(&seed.to_string()).into()),
            Command::ChangeTheme => Some(self.theme.name.into()),
            Command::PrecomputeGuessCounts if self.guess_counts.is_some() => Some("running".into()),
            _ => None,
        }
    }

    /// A command as a row: its label, and on the right its detail, a check (for a toggle) or its shortcut.
    pub(super) fn command_row(&self, command: Command, id: impl Into<ElementId>) -> Stateful<Div> {
        let t = self.theme;
        let toggled = match command {
            Command::ToggleUnlimited => Some(self.game.is_unlimited()),
            Command::ToggleLiveHints => Some(self.live_hints),
            Command::ToggleSidebar => Some(self.sidebar_open),
            Command::ToggleSolver => Some(self.solver.open),
            Command::ToggleSolverMode => Some(self.assist.is_some()),
            _ => None,
        };
        let shortcut = match command {
            Command::ToggleSidebar => Some(&SIDEBAR_SHORTCUT),
            Command::ToggleSolver => Some(&SOLVER_SHORTCUT),
            Command::ChangeTheme => Some(&THEME_PICKER_SHORTCUT),
            _ => None,
        };
        let right = div()
            .flex()
            .items_center()
            .gap_2()
            .children(self.detail(command).map(|detail| div().text_xs().text_color(rgb(t.muted)).child(detail)))
            .children(shortcut.map(|shortcut| widgets::shortcut(t, shortcut)))
            .children(toggled.map(|on| check(t, on)));
        menu_item(t, id, command.label(), right)
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
        let mut menu = panel(t, "settings-menu").mt_1().w(px(340.)).p_1();
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
                .items_center()
                .justify_between()
                .h(px(30.))
                .px_2()
                .text_sm()
                .text_color(rgb(t.muted))
                .child("Command palette")
                .child(widgets::shortcut(t, &PALETTE_SHORTCUT)),
        )
    }
}

/// The mark for a toggle that is on: a dot. Off, the space stays empty so the rows line up.
fn check(t: &Theme, on: bool) -> impl IntoElement {
    div().w(px(16.)).flex().justify_center().when(on, |slot| slot.child(div().size(px(6.)).rounded_full().bg(rgb(t.success))))
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
                .child(group_digits(&field.digits))
                .child(caret(t)),
        )
        .child(div().text_xs().text_color(rgb(t.muted)).child(field.hint()))
}


/// Fills the seed field from the clipboard (its digits, as `SeedField::paste` keeps them).
pub(super) fn paste_seed_button(t: &Theme, cx: &mut Context<WordleApp>) -> impl IntoElement {
    widgets::icon_button(t, "paste-seed", widgets::icon(widgets::IconName::ClipboardPaste, t.subtle)).on_click(cx.listener(|this, _, _, cx| this.paste(cx)))
}
