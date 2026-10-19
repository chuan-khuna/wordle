//! The window: the title bar and its settings menu, the sidebar, the board and the on-screen
//! keyboard, the status bar, and the command palette and theme picker that float above them.
//!
//! `WordleApp` holds the state and routes keys; each submodule draws one part of it.

mod board;
mod menu;
mod palette;
mod sidebar;
mod status_bar;
mod theme_picker;
pub mod title_bar;
mod widgets;

use std::collections::HashMap;

use gpui::{App, ClipboardItem, Context, FocusHandle, FontWeight, KeyBinding, KeyDownEvent, Window, actions, div, prelude::*, px, rgb};
use wordle_gpui::rules::game::{Game, MAX_GUESSES, random_seed};
use wordle_gpui::rules::words::WORD_LENGTH;

use crate::commands::{self, Command, CommandPalette, SeedField, SeedOutcome};
use crate::theme::picker::{self as theme_picker_state, ThemePicker};
use crate::theme::{self, Theme};
use board::{BACKSPACE, ENTER};
use sidebar::Meaning;

actions!(wordle, [Quit, ToggleCommandPalette, ToggleSidebar, ToggleThemePicker]);

const CHEERS: [&str; 6] = ["Genius!", "Magnificent!", "Impressive!", "Splendid!", "Great!", "Phew!"];

/// A key binding, and how the platform writes it.
pub struct Shortcut {
    keys: &'static str,
    mac: &'static str,
    other: &'static str,
}

impl Shortcut {
    pub fn label(&self) -> &'static str {
        if cfg!(target_os = "macos") { self.mac } else { self.other }
    }
}

pub const PALETTE_SHORTCUT: Shortcut = Shortcut { keys: "secondary-p", mac: "⌘P", other: "Ctrl+P" };
/// Zed's shortcut for its left dock.
pub const SIDEBAR_SHORTCUT: Shortcut = Shortcut { keys: "secondary-b", mac: "⌘B", other: "Ctrl+B" };
/// Zed's shortcut for its theme picker.
pub const THEME_PICKER_SHORTCUT: Shortcut = Shortcut { keys: "secondary-k secondary-t", mac: "⌘K ⌘T", other: "Ctrl+K Ctrl+T" };

pub fn bind_keys(cx: &mut App) {
    cx.bind_keys([
        KeyBinding::new("secondary-q", Quit, None),
        KeyBinding::new(PALETTE_SHORTCUT.keys, ToggleCommandPalette, None),
        KeyBinding::new(SIDEBAR_SHORTCUT.keys, ToggleSidebar, None),
        KeyBinding::new(THEME_PICKER_SHORTCUT.keys, ToggleThemePicker, None),
    ]);
    cx.on_action(|_: &Quit, cx| cx.quit());
}

/// What a message under the board is about, which picks its colour from the theme.
#[derive(Clone, Copy)]
enum Tone {
    Error,
    Success,
    Info,
}

/// What floats above the board. At most one is open; while one is, typing goes to it, not the board.
enum Overlay {
    /// The settings menu, hanging from the hamburger. `seed` is its seed field, while it shows.
    Menu { seed: Option<SeedField> },
    Palette(CommandPalette),
    ThemePicker(ThemePicker),
}

pub struct WordleApp {
    game: Game,
    /// The letters of the Guess being typed, not yet submitted.
    typed: String,
    /// Shown under the board, in a colour: a refused Guess, a cheer, or the Answer after a Loss.
    message: Option<(String, Tone)>,
    overlay: Option<Overlay>,
    sidebar_open: bool,
    /// Whether the typed Guess's tiles show what earlier Guesses say about each letter.
    live_hints: bool,
    /// The word whose meaning the sidebar shows.
    selected_word: Option<String>,
    /// Every word looked up so far, kept until the app closes.
    meanings: HashMap<String, Meaning>,
    theme: &'static Theme,
    pub focus_handle: FocusHandle,
}

impl WordleApp {
    pub fn new(game: Game, cx: &mut Context<Self>) -> Self {
        Self {
            game,
            typed: String::new(),
            message: None,
            overlay: None,
            sidebar_open: false,
            live_hints: false,
            selected_word: None,
            meanings: HashMap::new(),
            theme: &theme::ROSE_PINE,
            focus_handle: cx.focus_handle(),
        }
    }

    fn tone_colour(&self, tone: Tone) -> u32 {
        match tone {
            Tone::Error => self.theme.error,
            Tone::Success => self.theme.success,
            Tone::Info => self.theme.subtle,
        }
    }

    /// Close whatever is open, and open `overlay` instead.
    fn open(&mut self, overlay: Overlay, cx: &mut Context<Self>) {
        self.dismiss(cx);
        self.overlay = Some(overlay);
    }

    /// Close whatever is open. Closing the theme picker this way puts back the theme from before it opened.
    fn dismiss(&mut self, cx: &mut Context<Self>) {
        if let Some(Overlay::ThemePicker(picker)) = self.overlay.take() {
            self.theme = picker.original;
        }
        cx.notify();
    }

    fn toggle_menu(&mut self, cx: &mut Context<Self>) {
        match self.overlay {
            Some(Overlay::Menu { .. }) => self.dismiss(cx),
            _ => self.open(Overlay::Menu { seed: None }, cx),
        }
    }

    fn toggle_palette(&mut self, cx: &mut Context<Self>) {
        match self.overlay {
            Some(Overlay::Palette(_)) => self.dismiss(cx),
            _ => self.open(Overlay::Palette(CommandPalette::default()), cx),
        }
    }

    fn toggle_theme_picker(&mut self, cx: &mut Context<Self>) {
        match self.overlay {
            Some(Overlay::ThemePicker(_)) => self.dismiss(cx),
            _ => self.open(Overlay::ThemePicker(ThemePicker::new(self.theme)), cx),
        }
    }

    /// Run a command from the menu or the palette.
    fn run(&mut self, command: Command, window: &mut Window, cx: &mut Context<Self>) {
        match command {
            Command::Reset => self.new_game(self.game.max_guesses, cx),
            Command::Restart => self.play(self.game.restart(), cx),
            // The palette opens its own seed field, so this comes from the menu.
            Command::PlaySeed => self.overlay = Some(Overlay::Menu { seed: Some(SeedField::default()) }),
            Command::CopySeed => {
                self.dismiss(cx);
                self.message = Some(match self.game.seed {
                    Some(seed) => {
                        cx.write_to_clipboard(ClipboardItem::new_string(seed.to_string()));
                        (format!("Copied seed {seed}"), Tone::Info)
                    }
                    None => ("This Game has a chosen Answer, not a Seed".into(), Tone::Info),
                });
            }
            Command::ToggleUnlimited => {
                let other_limit = if self.game.is_unlimited() { Some(MAX_GUESSES) } else { None };
                self.new_game(other_limit, cx);
            }
            Command::ToggleLiveHints => {
                self.live_hints = !self.live_hints;
                self.dismiss(cx);
            }
            Command::ToggleSidebar => {
                self.dismiss(cx);
                self.toggle_sidebar(window, cx);
            }
            Command::ChangeTheme => self.open(Overlay::ThemePicker(ThemePicker::new(self.theme)), cx),
        }
        cx.notify();
    }

    fn choose_in_palette(&mut self, command: Command, window: &mut Window, cx: &mut Context<Self>) {
        if let Some(Overlay::Palette(palette)) = self.overlay.as_mut() {
            let outcome = palette.choose(command);
            self.apply_palette(outcome, window, cx);
        }
    }

    fn apply_palette(&mut self, outcome: commands::Outcome, window: &mut Window, cx: &mut Context<Self>) {
        match outcome {
            commands::Outcome::Run(command) => {
                self.overlay = None;
                self.run(command, window, cx);
            }
            commands::Outcome::PlaySeed(seed) => self.play(Game::random(seed, self.game.max_guesses), cx),
            commands::Outcome::Close => self.dismiss(cx),
            commands::Outcome::None => {}
        }
        cx.notify();
    }

    /// A key from the real keyboard: to whatever is open, or else to the board.
    fn key_down(&mut self, key: &str, typed: Option<&str>, window: &mut Window, cx: &mut Context<Self>) {
        match self.overlay.as_mut() {
            None => return self.press(key, cx),
            Some(Overlay::ThemePicker(picker)) => match picker.press(key, typed) {
                theme_picker_state::Outcome::Preview(theme) => self.theme = theme,
                theme_picker_state::Outcome::Confirm => self.overlay = None,
                theme_picker_state::Outcome::Cancel => self.dismiss(cx),
                theme_picker_state::Outcome::None => {}
            },
            Some(Overlay::Palette(palette)) => {
                let outcome = palette.press(key, typed);
                self.apply_palette(outcome, window, cx);
            }
            Some(Overlay::Menu { seed: Some(field) }) => match field.press(key) {
                SeedOutcome::Play(seed) => self.play(Game::random(seed, self.game.max_guesses), cx),
                SeedOutcome::Cancel => self.overlay = Some(Overlay::Menu { seed: None }),
                SeedOutcome::None => {}
            },
            Some(Overlay::Menu { seed: None }) => {
                if key == "escape" {
                    self.dismiss(cx);
                }
            }
        }
        cx.notify();
    }

    /// Handle one key on the board, from the real keyboard or a click on the on-screen one.
    fn press(&mut self, key: &str, cx: &mut Context<Self>) {
        if self.game.is_over() {
            return;
        }
        match key {
            ENTER => self.submit(),
            BACKSPACE => {
                self.typed.pop();
                self.message = None;
            }
            _ => {
                let mut letters = key.chars();
                if let (Some(letter), None) = (letters.next(), letters.next())
                    && letter.is_ascii_alphabetic()
                    && self.typed.len() < WORD_LENGTH
                {
                    self.typed.push(letter.to_ascii_lowercase());
                    self.message = None;
                }
            }
        }
        cx.notify();
    }

    fn submit(&mut self) {
        match self.game.guess(&self.typed) {
            Err(error) => self.message = Some((error.to_string(), Tone::Error)),
            Ok(_) => {
                self.typed.clear();
                self.message = if self.game.is_won() {
                    let cheer = CHEERS.get(self.game.guesses().len() - 1).unwrap_or(&"Got there!");
                    Some((cheer.to_string(), Tone::Success))
                } else if self.game.is_lost() {
                    Some((format!("The answer was {}", self.game.answer().to_uppercase()), Tone::Error))
                } else {
                    None
                };
            }
        }
    }

    /// Start a new random Game with this Guess Limit.
    fn new_game(&mut self, max_guesses: Option<usize>, cx: &mut Context<Self>) {
        self.play(Game::random(random_seed(), max_guesses), cx);
    }

    /// Switch to `game` and close the menu or palette.
    fn play(&mut self, game: Game, cx: &mut Context<Self>) {
        self.game = game;
        self.typed.clear();
        self.message = None;
        self.selected_word = None;
        self.dismiss(cx);
    }

    /// The command that plays this same Answer again.
    fn replay_hint(&self) -> String {
        let pick = match self.game.seed {
            Some(seed) => format!("--seed {seed}"),
            None => format!("--answer {}", self.game.answer()),
        };
        let unlimited = if self.game.is_unlimited() { " --unlimited" } else { "" };
        format!("Replay: just wordle-gpui {pick}{unlimited}")
    }

    /// Shown once the Game is over.
    fn render_share_button(&self, cx: &mut Context<Self>) -> impl IntoElement {
        div().h(px(32.)).when(self.game.is_over(), |area| {
            area.child(widgets::button(self.theme, "share", "Copy share grid").on_click(cx.listener(|this, _, _, cx| {
                cx.write_to_clipboard(ClipboardItem::new_string(this.game.share_grid()));
                this.message = Some(("Copied to the clipboard".into(), Tone::Info));
                cx.notify();
            })))
        })
    }
}

impl Render for WordleApp {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let mut footer = div().flex().flex_col().items_center().gap_1().h(px(44.));
        let t = self.theme;
        if let Some((message, tone)) = &self.message {
            footer = footer.child(div().text_color(rgb(self.tone_colour(*tone))).font_weight(FontWeight::BOLD).child(message.clone()));
        }
        if self.game.is_over() {
            footer = footer.child(div().text_xs().text_color(rgb(t.muted)).child(self.replay_hint()));
        }

        div()
            .track_focus(&self.focus_handle)
            .on_action(cx.listener(|this, _: &ToggleCommandPalette, _, cx| this.toggle_palette(cx)))
            .on_action(cx.listener(|this, _: &ToggleSidebar, window, cx| this.toggle_sidebar(window, cx)))
            .on_action(cx.listener(|this, _: &ToggleThemePicker, _, cx| this.toggle_theme_picker(cx)))
            .on_key_down(cx.listener(|this, event: &KeyDownEvent, window, cx| {
                let keystroke = &event.keystroke;
                let modifiers = &keystroke.modifiers;
                if modifiers.platform || modifiers.control || modifiers.alt {
                    return;
                }
                this.key_down(&keystroke.key, keystroke.key_char.as_deref(), window, cx);
            }))
            .relative()
            .size_full()
            .flex()
            .flex_col()
            .bg(rgb(t.background))
            .child(title_bar::render(t, self.render_menu_button(cx), window))
            .child(
                div().flex().flex_1().min_h_0().when(self.sidebar_open, |row| row.child(self.render_sidebar(cx))).child(
                div()
                    .flex_1()
                    .min_h_0()
                    .flex()
                    .flex_col()
                    .items_center()
                    .gap_3()
                    .p_4()
                    .child(div().text_3xl().font_weight(FontWeight::BOLD).text_color(rgb(t.heading)).child("WORDLE"))
                    .child(self.render_board())
                    .child(footer)
                    .child(self.render_keyboard(cx))
                    .child(self.render_share_button(cx)),
                ),
            )
            .child(self.render_status_bar(cx))
            // While anything is open, a click anywhere else closes it (it draws above this).
            // Closing the theme picker this way puts the old theme back.
            .when(self.overlay.is_some(), |root| {
                root.child(div().id("backdrop").absolute().inset_0().occlude().on_click(cx.listener(|this, _, _, cx| this.dismiss(cx))))
            })
            .map(|root| match &self.overlay {
                Some(Overlay::Palette(palette)) => root.child(self.render_palette(palette, cx)),
                Some(Overlay::ThemePicker(picker)) => root.child(self.render_theme_picker(picker, cx)),
                _ => root,
            })
    }
}
