//! The window: the title bar and its settings menu, the sidebar, the board and the on-screen
//! keyboard, the status bar, and the command palette and theme picker that float above them.
//!
//! `WordleApp` holds the state and routes keys; each submodule draws one part of it.

mod board;
mod menu;
mod palette;
mod precompute_picker;
mod sidebar;
mod status_bar;
mod theme_picker;
pub mod title_bar;
mod widgets;

use std::collections::HashMap;
use std::time::{Duration, Instant};

use gpui::{App, ClipboardItem, Context, FocusHandle, FontWeight, KeyBinding, KeyDownEvent, Keystroke, ScrollHandle, SharedString, Window, actions, div, prelude::*, px, rgb};
use wordle_gpui::rules::game::{Game, MAX_GUESSES, random_seed};
use wordle_gpui::rules::matrix;
use wordle_gpui::rules::words::WORD_LENGTH;

use crate::commands::{self, Command, CommandPalette, SeedField, SeedOutcome};
use crate::precompute::{self, ThreadPicker};
use crate::theme::picker::{self as theme_picker_state, ThemePicker};
use crate::theme::{self, Theme};
use board::{BACKSPACE, ENTER};
use widgets::IconName;
use sidebar::Meaning;

actions!(wordle, [Quit, Paste, ToggleCommandPalette, ToggleSidebar, ToggleThemePicker]);

const CHEERS: [&str; 6] = ["Genius!", "Magnificent!", "Impressive!", "Splendid!", "Great!", "Phew!"];

/// A key binding. `widgets::shortcut` draws it, in the platform's own notation.
pub struct Shortcut {
    keys: &'static str,
}

impl Shortcut {
    /// The key presses of this shortcut, one for each step of a chord.
    pub fn keystrokes(&self) -> Vec<Keystroke> {
        self.keys.split(' ').filter_map(|keys| Keystroke::parse(keys).ok()).collect()
    }
}

pub const PALETTE_SHORTCUT: Shortcut = Shortcut { keys: "secondary-p" };
/// Zed's shortcut for its left dock.
pub const SIDEBAR_SHORTCUT: Shortcut = Shortcut { keys: "secondary-b" };
/// Zed's shortcut for its theme picker.
pub const THEME_PICKER_SHORTCUT: Shortcut = Shortcut { keys: "secondary-k secondary-t" };

pub fn bind_keys(cx: &mut App) {
    cx.bind_keys([
        KeyBinding::new("secondary-q", Quit, None),
        KeyBinding::new("secondary-v", Paste, None),
        KeyBinding::new(PALETTE_SHORTCUT.keys, ToggleCommandPalette, None),
        KeyBinding::new(SIDEBAR_SHORTCUT.keys, ToggleSidebar, None),
        KeyBinding::new(THEME_PICKER_SHORTCUT.keys, ToggleThemePicker, None),
    ]);
    cx.on_action(|_: &Quit, cx| cx.quit());
}

/// How long a note stays in the status bar.
const STATUS_TIME: Duration = Duration::from_secs(2);

/// What a message under the board is about, which picks its colour from the theme.
#[derive(Clone, Copy)]
enum Tone {
    Error,
    Success,
}

/// What floats above the board. At most one is open; while one is, typing goes to it, not the board.
enum Overlay {
    /// The settings menu, hanging from the hamburger. `seed` is its seed field, while it shows.
    Menu { seed: Option<SeedField> },
    Palette(CommandPalette),
    ThemePicker(ThemePicker),
    /// Chooses how many threads precompute the Feedback matrices.
    Precompute(ThreadPicker),
}

pub struct WordleApp {
    game: Game,
    /// The letters of the Guess being typed, not yet submitted.
    typed: String,
    /// Shown under the board, in a colour: a refused Guess, a cheer, or "Out of guesses" after a Loss.
    message: Option<(String, Tone)>,
    /// A short note in the status bar that confirms a copy and goes away by itself (see `show_status`).
    status: Option<SharedString>,
    /// Counts notes, so an old note's timer can't hide a newer one.
    status_serial: u32,
    /// Whether the Answer of a lost Game has been revealed. It stays hidden until clicked.
    answer_shown: bool,
    overlay: Option<Overlay>,
    /// Whether the Feedback matrices are being precomputed in the background.
    precomputing: bool,
    sidebar_open: bool,
    /// How wide the sidebar is (with its gap), dragged by `render_sidebar_handle`.
    sidebar_width: gpui::Pixels,
    resizing_sidebar: bool,
    /// Whether the typed Guess's tiles show what earlier Guesses say about each letter.
    live_hints: bool,
    /// The word whose meaning the sidebar shows.
    selected_word: Option<String>,
    /// Every word looked up so far, kept until the app closes.
    meanings: HashMap<String, Meaning>,
    /// Scroll position of the meaning section in the sidebar, which its scroll bar follows.
    meaning_scroll: ScrollHandle,
    theme: &'static Theme,
    pub focus_handle: FocusHandle,
}

impl WordleApp {
    pub fn new(game: Game, cx: &mut Context<Self>) -> Self {
        Self {
            game,
            typed: String::new(),
            message: None,
            status: None,
            status_serial: 0,
            answer_shown: false,
            overlay: None,
            precomputing: false,
            sidebar_open: false,
            sidebar_width: sidebar::DEFAULT_WIDTH,
            resizing_sidebar: false,
            live_hints: false,
            selected_word: None,
            meanings: HashMap::new(),
            meaning_scroll: ScrollHandle::new(),
            theme: &theme::ROSE_PINE,
            focus_handle: cx.focus_handle(),
        }
    }

    fn tone_colour(&self, tone: Tone) -> u32 {
        match tone {
            Tone::Error => self.theme.error,
            Tone::Success => self.theme.success,
        }
    }

    /// Put `text` on the clipboard and say so in the status bar.
    fn copy(&mut self, text: String, confirmation: impl Into<SharedString>, cx: &mut Context<Self>) {
        cx.write_to_clipboard(ClipboardItem::new_string(text));
        self.show_status(confirmation, cx);
    }

    /// Show a note in the status bar for `STATUS_TIME`, then hide it.
    fn show_status(&mut self, text: impl Into<SharedString>, cx: &mut Context<Self>) {
        self.show_status_for(text, STATUS_TIME, cx);
    }

    /// Show a note in the status bar for `time`, then hide it (or sooner, if a newer note replaces it).
    fn show_status_for(&mut self, text: impl Into<SharedString>, time: Duration, cx: &mut Context<Self>) {
        self.status_serial += 1;
        let serial = self.status_serial;
        self.status = Some(text.into());
        cx.spawn(async move |this, cx| {
            cx.background_executor().timer(time).await;
            this.update(cx, |this, cx| {
                if this.status_serial == serial {
                    this.status = None;
                    cx.notify();
                }
            })
            .ok();
        })
        .detach();
        cx.notify();
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
                match self.game.seed {
                    Some(seed) => self.copy(seed.to_string(), format!("Copied seed {seed}"), cx),
                    None => self.show_status("This game has a chosen answer, so it has no seed", cx),
                }
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
            Command::Precompute if self.precomputing => {
                self.dismiss(cx);
                self.show_status("Already precomputing the matrices", cx);
            }
            Command::Precompute => self.open(Overlay::Precompute(ThreadPicker::default()), cx),
            Command::ResetLayout => {
                self.dismiss(cx);
                self.sidebar_open = false;
                self.sidebar_width = sidebar::DEFAULT_WIDTH;
                if !window.is_maximized() && !window.is_fullscreen() {
                    window.resize(gpui::size(px(520.), px(980.)));
                }
            }
        }
        cx.notify();
    }

    /// Score every Guess against every Answer on `threads` threads, off the window's thread, and
    /// save the two Feedback matrices (see `rules/matrix.rs`). The status bar says when it is done.
    fn start_precompute(&mut self, threads: usize, cx: &mut Context<Self>) {
        self.overlay = None;
        self.precomputing = true;
        self.show_status_for(format!("Precomputing matrices on {}…", precompute::threads_label(threads)), Duration::from_secs(600), cx);
        let work = cx.background_spawn(async move {
            let started = Instant::now();
            let saved = matrix::build(&matrix::default_dir(), threads);
            (saved, started.elapsed())
        });
        cx.spawn(async move |this, cx| {
            let (saved, elapsed) = work.await;
            this.update(cx, |app, cx| {
                app.precomputing = false;
                let note = match saved {
                    Ok(_) => format!("Saved the matrices to matrices/ in {:.1}s ({})", elapsed.as_secs_f32(), precompute::threads_label(threads)),
                    Err(error) => format!("Couldn't save the matrices: {error}"),
                };
                app.show_status_for(note, Duration::from_secs(5), cx);
            })
            .ok();
        })
        .detach();
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
            Some(Overlay::Precompute(picker)) => match picker.press(key) {
                precompute::Outcome::Run(threads) => self.start_precompute(threads, cx),
                precompute::Outcome::Cancel => self.dismiss(cx),
                precompute::Outcome::None => {}
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

    /// Text from the clipboard, into the seed field or the palette's query, whichever shows.
    pub(super) fn paste(&mut self, cx: &mut Context<Self>) {
        let Some(text) = cx.read_from_clipboard().and_then(|item| item.text()) else {
            return self.show_status("The clipboard has no text to paste", cx);
        };
        match self.overlay.as_mut() {
            Some(Overlay::Palette(palette)) => palette.paste(&text),
            Some(Overlay::Menu { seed: Some(field) }) => field.paste(&text),
            _ => return,
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
                    Some(("Out of guesses".into(), Tone::Error))
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
        self.answer_shown = false;
        self.selected_word = None;
        self.dismiss(cx);
    }

    /// The command that plays this same Answer again.
    fn replay_command(&self) -> String {
        let pick = match self.game.seed {
            Some(seed) => format!("--seed {seed}"),
            None => format!("--answer {}", self.game.answer()),
        };
        let unlimited = if self.game.is_unlimited() { " --unlimited" } else { "" };
        format!("just wordle-gpui {pick}{unlimited}")
    }

    /// Under the board once the Game is over: how it ended, and the command that replays it (click to copy).
    fn render_footer(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let t = self.theme;
        let mut footer = div().flex().flex_col().items_center().gap_1().h(px(52.)).flex_none();
        if let Some((message, tone)) = &self.message {
            footer = footer.child(div().text_color(rgb(self.tone_colour(*tone))).font_weight(FontWeight::BOLD).child(message.clone()));
        }
        if self.game.is_lost() {
            let word = if self.answer_shown { self.game.answer().to_uppercase() } else { "•".repeat(WORD_LENGTH) };
            let (tip, icon) = if self.answer_shown { ("hide-answer", widgets::icon(IconName::EyeOff, t.subtle)) } else { ("show-answer", widgets::icon(IconName::Eye, t.subtle)) };
            footer = footer.child(
                div()
                    .flex()
                    .items_center()
                    .gap_1p5()
                    .child(div().text_color(rgb(t.muted)).child("The answer is"))
                    .child(div().font_weight(FontWeight::BOLD).text_color(rgb(t.text)).child(word))
                    .child(widgets::icon_button(t, tip, icon).on_click(cx.listener(|this, _, _, cx| {
                        this.answer_shown = !this.answer_shown;
                        cx.notify();
                    }))),
            );
        }
        footer
    }

    /// Shown once the Game is over: copy the result, try the same word again, or play a new word,
    /// with the command that replays it (click to copy) beneath.
    fn render_end_buttons(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let t = self.theme;
        div().h(px(76.)).flex_none().mt_4().flex().flex_col().items_center().gap_2().when(self.game.is_over(), |area| {
            area.child(
                div()
                    .flex()
                    .gap_2()
                    .flex_wrap()
                    .justify_center()
                    .child(
                        widgets::button(t, "share", "Copy results")
                            .on_click(cx.listener(|this, _, _, cx| this.copy(this.game.share_grid(), "Copied your results. Paste them to share.", cx))),
                    )
                    .child(widgets::button(t, "restart", "Try this word again").on_click(cx.listener(|this, _, window, cx| this.run(Command::Restart, window, cx))))
                    .child(widgets::button(t, "new-game", "Play a new word").on_click(cx.listener(|this, _, window, cx| this.run(Command::Reset, window, cx)))),
            )
            .child(
                div()
                    .flex()
                    .items_center()
                    .gap_1p5()
                    .text_xs()
                    .text_color(rgb(t.muted))
                    .child("Play it again")
                    .child(div().font_family(widgets::MONO_FONT).text_color(rgb(t.text)).child(self.replay_command()))
                    .child(widgets::icon_button(t, "copy-replay", widgets::icon(IconName::Copy, t.subtle)).on_click(cx.listener(|this, _, _, cx| {
                        this.copy(this.replay_command(), "Copied the replay command", cx);
                    }))),
            )
        })
    }

}

impl Render for WordleApp {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let t = self.theme;

        div()
            .track_focus(&self.focus_handle)
            .on_action(cx.listener(|this, _: &Paste, _, cx| this.paste(cx)))
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
            .on_mouse_move(cx.listener(|this, event: &gpui::MouseMoveEvent, _, cx| this.drag_sidebar(event.position.x, cx)))
            .on_mouse_up(gpui::MouseButton::Left, cx.listener(|this, _, _, cx| {
                this.resizing_sidebar = false;
                cx.notify();
            }))
            .relative()
            .size_full()
            .flex()
            .flex_col()
            .bg(rgb(t.background))
            .child(title_bar::render(t, self.render_menu_button(cx), window))
            // The sidebar and the board are islands: rounded panels floating on the window, with a gap between them.
            .child(
                div().flex().flex_1().min_h_0().px_2().pb_1().when(self.sidebar_open, |row| row.child(self.render_sidebar(cx)).child(self.render_sidebar_handle(cx))).child(
                div()
                    .flex_1()
                    .min_h(px(770.))
                    .min_w(px(440.))
                    .rounded_xl()
                    .bg(rgb(t.surface))
                    .flex()
                    .flex_col()
                    .items_center()
                    .gap_3()
                    .p_4()
                    .child(div().text_3xl().font_weight(FontWeight::BOLD).text_color(rgb(t.heading)).child("WORDLE"))
                    .child(self.render_board())
                    .child(self.render_footer(cx))
                    .child(self.render_keyboard(cx))
                    .child(self.render_end_buttons(cx)),
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
                Some(Overlay::Precompute(picker)) => root.child(self.render_precompute_picker(picker, cx)),
                _ => root,
            })
    }
}
