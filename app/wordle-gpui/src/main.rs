//! The desktop game: the title bar and its settings menu, the theme picker, the board and the on-screen keyboard, drawn with gpui.

mod theme;
mod theme_picker;
mod title_bar;

use std::collections::HashMap;
use std::collections::hash_map::RandomState;
use std::hash::{BuildHasher, Hasher};

use gpui::{
    AnyElement, App, Application, Bounds, ClipboardItem, Context, Corner, FocusHandle, FontWeight,
    KeyBinding, KeyDownEvent, SharedString, Window, WindowBounds, WindowOptions, actions, anchored,
    deferred, div, prelude::*, px, rgb, size,
};
use theme::Theme;
use theme_picker::{Outcome, ThemePicker};
use wordle_gpui::feedback::Mark;
use wordle_gpui::game::{Game, Guess, MAX_GUESSES, MAX_SEED};
use wordle_gpui::words::WORD_LENGTH;

actions!(wordle, [Quit, ToggleThemePicker]);

/// Zed's shortcut for its theme picker.
const THEME_PICKER_KEYS: &str = "secondary-k secondary-t";

const KEYBOARD_ROWS: [&str; 3] = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
const CHEERS: [&str; 6] = ["Genius!", "Magnificent!", "Impressive!", "Splendid!", "Great!", "Phew!"];
const ENTER: &str = "enter";
const BACKSPACE: &str = "backspace";

/// How the player started the app: `--answer WORD`, `--seed N`, `--unlimited`.
struct Args {
    answer: Option<String>,
    seed: Option<u32>,
    unlimited: bool,
}

impl Args {
    fn parse() -> Result<Self, String> {
        let mut args = Args { answer: None, seed: None, unlimited: false };
        let mut rest = std::env::args().skip(1);
        while let Some(arg) = rest.next() {
            match arg.as_str() {
                "--answer" => args.answer = Some(rest.next().ok_or("--answer needs a word")?),
                "--seed" => {
                    let seed = rest.next().and_then(|s| s.parse().ok()).filter(|s| *s <= MAX_SEED);
                    args.seed = Some(seed.ok_or(format!("--seed needs a whole number from 0 to {MAX_SEED}"))?);
                }
                "--unlimited" => args.unlimited = true,
                "-h" | "--help" => {
                    println!("Play Wordle in a window.\n\nOptions:\n  --answer WORD  play with this Answer instead of a random one\n  --seed N       replay the Answer picked by this seed (the same as the terminal game's)\n  --unlimited    no Guess Limit: keep guessing until you win");
                    std::process::exit(0);
                }
                other => return Err(format!("unknown argument {other:?} (try --help)")),
            }
        }
        Ok(args)
    }

    fn max_guesses(&self) -> Option<usize> {
        if self.unlimited { None } else { Some(MAX_GUESSES) }
    }

    fn first_game(&self) -> Result<Game, String> {
        match (&self.answer, self.seed) {
            (Some(answer), _) => Game::new(answer, self.max_guesses()).map_err(|e| e.to_string()),
            (None, Some(seed)) => Ok(Game::random(seed, self.max_guesses())),
            (None, None) => Ok(Game::random(random_seed(), self.max_guesses())),
        }
    }
}

/// A Seed from 0 to MAX_SEED, different every time.
fn random_seed() -> u32 {
    (RandomState::new().build_hasher().finish() % (MAX_SEED as u64 + 1)) as u32
}

/// What each guessed letter is known to be. Correct beats Present beats Absent.
fn best_marks(guesses: &[Guess]) -> HashMap<char, Mark> {
    let mut known = HashMap::new();
    for guess in guesses {
        for (letter, mark) in guess.word.chars().zip(&guess.feedback) {
            let best = known.entry(letter).or_insert(*mark);
            *best = (*best).max(*mark);
        }
    }
    known
}

/// What a message under the board is about, which picks its colour from the theme.
#[derive(Clone, Copy)]
enum Tone {
    Error,
    Success,
    Info,
}

struct WordleApp {
    game: Game,
    /// The letters of the Guess being typed, not yet submitted.
    typed: String,
    /// Shown under the board, in a colour: a refused Guess, a cheer, or the Answer after a Loss.
    message: Option<(String, Tone)>,
    /// Whether the settings menu (the hamburger in the title bar) is open.
    menu_open: bool,
    /// The digits typed into the menu's seed field, while it is showing.
    seed_entry: Option<String>,
    /// The theme picker, while it is open.
    theme_picker: Option<ThemePicker>,
    theme: &'static Theme,
    focus_handle: FocusHandle,
}

impl WordleApp {
    fn new(game: Game, cx: &mut Context<Self>) -> Self {
        Self {
            game,
            typed: String::new(),
            message: None,
            menu_open: false,
            seed_entry: None,
            theme_picker: None,
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

    fn open_theme_picker(&mut self, cx: &mut Context<Self>) {
        self.set_menu_open(false, cx);
        self.theme_picker = Some(ThemePicker::new(self.theme));
    }

    /// Close the picker, keeping the theme on screen, or putting back the one from before it opened.
    fn close_theme_picker(&mut self, keep: bool, cx: &mut Context<Self>) {
        if let Some(picker) = self.theme_picker.take()
            && !keep
        {
            self.theme = picker.original;
        }
        cx.notify();
    }

    fn press_in_theme_picker(&mut self, key: &str, typed: Option<&str>, cx: &mut Context<Self>) {
        let Some(picker) = self.theme_picker.as_mut() else { return };
        match picker.press(key, typed) {
            Outcome::Preview(theme) => self.theme = theme,
            Outcome::Confirm => self.close_theme_picker(true, cx),
            Outcome::Cancel => self.close_theme_picker(false, cx),
            Outcome::None => {}
        }
        cx.notify();
    }

    /// Handle one key, from the real keyboard or a click on the on-screen one.
    fn press(&mut self, key: &str, cx: &mut Context<Self>) {
        if self.seed_entry.is_some() {
            self.press_in_seed_field(key, cx);
            return;
        }
        if self.menu_open {
            if key == "escape" {
                self.set_menu_open(false, cx);
            }
            return;
        }
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

    /// Start a new random Game, keeping the Guess Limit unless `max_guesses` changes it.
    fn new_game(&mut self, max_guesses: Option<usize>, cx: &mut Context<Self>) {
        self.play(Game::random(random_seed(), max_guesses), cx);
    }

    /// Switch to `game` and close the menu.
    fn play(&mut self, game: Game, cx: &mut Context<Self>) {
        self.game = game;
        self.typed.clear();
        self.message = None;
        self.set_menu_open(false, cx);
    }

    fn set_menu_open(&mut self, open: bool, cx: &mut Context<Self>) {
        self.menu_open = open;
        self.seed_entry = None;
        cx.notify();
    }

    /// Digits, Backspace, Enter (play that Seed) and Escape (back to the menu) for the seed field.
    fn press_in_seed_field(&mut self, key: &str, cx: &mut Context<Self>) {
        let Some(entry) = self.seed_entry.as_mut() else { return };
        match key {
            ENTER => {
                // At most six digits, so any Seed typed is within 0..=MAX_SEED.
                if let Ok(seed) = entry.parse() {
                    self.play(Game::random(seed, self.game.max_guesses), cx);
                }
            }
            BACKSPACE => {
                entry.pop();
            }
            "escape" => self.seed_entry = None,
            _ if key.len() == 1 && key.chars().all(|c| c.is_ascii_digit()) && entry.len() < MAX_SEED.to_string().len() => {
                entry.push_str(key);
            }
            _ => {}
        }
        cx.notify();
    }

    /// The title bar's crumbs: the Guess Limit, then the Seed (or "chosen answer").
    fn crumbs(&self) -> Vec<SharedString> {
        let limit = if self.game.is_unlimited() { "unlimited" } else { "classic" };
        let pick = match self.game.seed {
            Some(seed) => format!("seed {seed}"),
            None => "chosen answer".into(),
        };
        vec![limit.into(), pick.into()]
    }

    /// Guesses left, or the Guess count when unlimited.
    fn status_line(&self) -> String {
        match self.game.guesses_left() {
            Some(left) => format!("{left} guesses left"),
            None => format!("guess {} · no limit", self.game.guesses().len()),
        }
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

    fn render_board(&self) -> impl IntoElement {
        let submitted = self.game.guesses().iter().map(|guess| {
            row(guess.word.chars().zip(&guess.feedback).map(|(letter, mark)| {
                let (fill, text) = self.theme.mark(*mark);
                tile(Some(letter), Some(fill), fill, text)
            }))
        });

        // The row being typed, then empty rows: up to the Guess Limit, or none in an unlimited Game.
        let empty_rows = match self.game.guesses_left() {
            _ if self.game.is_over() => 0,
            Some(left) => left,
            None => 1,
        };
        let typing = (0..empty_rows).map(|row_index| {
            row((0..WORD_LENGTH).map(move |i| {
                let letter = if row_index == 0 { self.typed.chars().nth(i) } else { None };
                let border = if letter.is_some() { self.theme.muted } else { self.theme.highlight_med };
                tile(letter, None, border, self.theme.text)
            }))
        });

        div()
            .id("board")
            .flex()
            .flex_col()
            .items_center()
            .gap_1p5()
            .flex_1()
            .min_h_0()
            .overflow_y_scroll()
            .children(submitted.chain(typing))
    }

    fn render_keyboard(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let known = best_marks(self.game.guesses());
        let unused = (self.theme.highlight_med, self.theme.text);
        let mut rows = Vec::new();
        for (row_index, letters) in KEYBOARD_ROWS.iter().enumerate() {
            let mut keys = Vec::new();
            if row_index == 2 {
                keys.push(self.key(ENTER.into(), "ENTER".into(), unused, px(64.), cx));
            }
            for letter in letters.chars() {
                let colours = known.get(&letter).map_or(unused, |mark| match mark {
                    Mark::Absent => self.theme.absent_key,
                    _ => self.theme.mark(*mark),
                });
                keys.push(self.key(letter.to_string(), letter.to_ascii_uppercase().to_string(), colours, px(40.), cx));
            }
            if row_index == 2 {
                keys.push(self.key(BACKSPACE.into(), "⌫".into(), unused, px(64.), cx));
            }
            rows.push(div().flex().justify_center().gap_1p5().children(keys));
        }
        div().flex().flex_col().gap_2().children(rows)
    }

    fn key(&self, key: String, label: String, (fill, text): (u32, u32), width: gpui::Pixels, cx: &mut Context<Self>) -> gpui::Stateful<gpui::Div> {
        div()
            .id(SharedString::from(format!("key-{key}")))
            .w(width)
            .h(px(56.))
            .flex()
            .items_center()
            .justify_center()
            .rounded_md()
            .bg(rgb(fill))
            .text_color(rgb(text))
            .font_weight(FontWeight::BOLD)
            .text_sm()
            .cursor_pointer()
            .hover(|style| style.opacity(0.85))
            .on_click(cx.listener(move |this, _, window, cx| {
                window.focus(&this.focus_handle);
                this.press(&key, cx);
            }))
            .child(label)
    }

    /// Shown once the Game is over.
    fn render_share_button(&self, cx: &mut Context<Self>) -> impl IntoElement {
        div().h(px(32.)).when(self.game.is_over(), |area| {
            area.child(button(self.theme, "share", "Copy share grid").on_click(cx.listener(|this, _, _, cx| {
                cx.write_to_clipboard(ClipboardItem::new_string(this.game.share_grid()));
                this.message = Some(("Copied to the clipboard".into(), Tone::Info));
                cx.notify();
            })))
        })
    }

    /// The hamburger in the title bar, with the settings menu hanging from its bottom-right corner.
    fn render_menu_button(&self, cx: &mut Context<Self>) -> AnyElement {
        let overlay = self.theme.overlay;
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
                    .when(self.menu_open, |button| button.bg(rgb(overlay)))
                    .hover(move |style| style.bg(rgb(overlay)))
                    .on_click(cx.listener(|this, _, window, cx| {
                        window.focus(&this.focus_handle);
                        this.set_menu_open(!this.menu_open, cx);
                    }))
                    .child(bars),
            )
            .when(self.menu_open, |container| {
                container.child(
                    div()
                        .absolute()
                        .top_full()
                        .right_0()
                        .child(deferred(anchored().anchor(Corner::TopRight).snap_to_window().child(self.render_menu(cx)))),
                )
            })
            .into_any_element()
    }

    fn render_menu(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let max_guesses = self.game.max_guesses;
        let other_limit = if max_guesses.is_some() { None } else { Some(MAX_GUESSES) };
        let t = self.theme;
        let restart_hint: SharedString = match self.game.seed {
            Some(seed) => format!("Same Answer, seed {seed}").into(),
            None => "Same Answer".into(),
        };

        div()
            .id("settings-menu")
            .occlude()
            .mt_1()
            .w(px(220.))
            .p_1()
            .flex()
            .flex_col()
            .rounded_lg()
            .bg(rgb(t.surface))
            .border_1()
            .border_color(rgb(t.highlight_med))
            .shadow_lg()
            .child(
                menu_item(t, "reset", "Reset game", "Pick a new Answer").on_click(cx.listener(move |this, _, _, cx| {
                    this.new_game(max_guesses, cx);
                })),
            )
            .child(
                menu_item(t, "restart", "Restart game", restart_hint).on_click(cx.listener(|this, _, _, cx| {
                    this.play(this.game.restart(), cx);
                })),
            )
            .child(match &self.seed_entry {
                None => menu_item(t, "play-seed", "Play a seed…", "Replay any Answer by its Seed")
                    .on_click(cx.listener(|this, _, _, cx| {
                        this.seed_entry = Some(String::new());
                        cx.notify();
                    }))
                    .into_any_element(),
                Some(entry) => seed_field(t, entry).into_any_element(),
            })
            .child(div().my_1().h(px(1.)).bg(rgb(t.overlay)))
            .child(
                menu_item(t, "unlimited", "Unlimited guesses", "Starts a new game")
                    .child(
                        div()
                            .w(px(16.))
                            .text_color(rgb(t.success))
                            .font_weight(FontWeight::BOLD)
                            .when(max_guesses.is_none(), |check| check.child("✓")),
                    )
                    .on_click(cx.listener(move |this, _, _, cx| {
                        this.new_game(other_limit, cx);
                    })),
            )
            .child(div().my_1().h(px(1.)).bg(rgb(t.overlay)))
            .child(
                menu_item(t, "theme", "Change theme…", t.name)
                    .child(div().text_xs().text_color(rgb(t.muted)).child(shortcut_label()))
                    .on_click(cx.listener(|this, _, _, cx| this.open_theme_picker(cx))),
            )
    }

    /// The picker floats near the top of the window, like Zed's: a search field, then the matching themes.
    fn render_theme_picker(&self, picker: &ThemePicker, cx: &mut Context<Self>) -> impl IntoElement {
        let t = self.theme;
        let matches = picker.matches();
        let query = if picker.query.is_empty() {
            div().text_color(rgb(t.muted)).child("Select a theme…")
        } else {
            div().text_color(rgb(t.text)).child(picker.query.clone())
        };

        let mut list = div().flex().flex_col().p_1();
        for (index, theme) in matches.iter().copied().enumerate() {
            list = list.child(
                div()
                    .id(SharedString::from(format!("theme-{index}")))
                    .flex()
                    .justify_between()
                    .px_2()
                    .py_1()
                    .rounded_md()
                    .cursor_pointer()
                    .text_sm()
                    .when(index == picker.selected, |row| row.bg(rgb(t.overlay)))
                    .hover(|style| style.bg(rgb(t.overlay)))
                    .on_click(cx.listener(move |this, _, _, cx| {
                        this.theme = theme;
                        this.close_theme_picker(true, cx);
                    }))
                    .child(div().text_color(rgb(t.text)).child(theme.name))
                    .child(div().text_color(rgb(t.muted)).child(theme.appearance())),
            );
        }
        if matches.is_empty() {
            list = list.child(div().px_2().py_1().text_sm().text_color(rgb(t.muted)).child("No matching themes"));
        }

        div().absolute().top(px(56.)).left_0().right_0().flex().justify_center().child(
            div()
                .id("theme-picker")
                .occlude()
                .w(px(360.))
                .flex()
                .flex_col()
                .rounded_lg()
                .bg(rgb(t.surface))
                .border_1()
                .border_color(rgb(t.highlight_med))
                .shadow_lg()
                .child(
                    div()
                        .flex()
                        .items_center()
                        .h(px(36.))
                        .px_3()
                        .border_b_1()
                        .border_color(rgb(t.overlay))
                        .text_sm()
                        .child(query)
                        .child(div().w(px(1.5)).h(px(14.)).ml(px(1.)).bg(rgb(t.accent))),
                )
                .child(list),
        )
    }
}

fn row(tiles: impl Iterator<Item = gpui::Div>) -> gpui::Div {
    div().flex().gap_1p5().children(tiles)
}

fn tile(letter: Option<char>, fill: Option<u32>, border: u32, text: u32) -> gpui::Div {
    div()
        .size(px(58.))
        .flex()
        .items_center()
        .justify_center()
        .rounded_sm()
        .when_some(fill, |tile, fill| tile.bg(rgb(fill)))
        .border_2()
        .border_color(rgb(border))
        .text_color(rgb(text))
        .text_2xl()
        .font_weight(FontWeight::BOLD)
        .children(letter.map(|l| l.to_ascii_uppercase().to_string()))
}

/// The seed field that replaces "Play a seed…" in the menu: the digits typed so far and a caret.
fn seed_field(t: &Theme, entry: &str) -> impl IntoElement {
    let hint = if entry.is_empty() { format!("Type 0 to {MAX_SEED}") } else { "Enter to play · Esc to cancel".into() };
    div()
        .flex()
        .flex_col()
        .gap_1()
        .px_2()
        .py_1()
        .child(div().text_sm().text_color(rgb(t.text)).child("Play a seed"))
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
                .child(entry.to_string())
                .child(div().w(px(1.5)).h(px(14.)).ml(px(1.)).bg(rgb(t.accent))),
        )
        .child(div().text_xs().text_color(rgb(t.muted)).child(hint))
}

/// A row of the settings menu: a label, a dimmer hint under it, and room on the right for a check.
fn menu_item(t: &Theme, id: &'static str, label: &'static str, hint: impl Into<SharedString>) -> gpui::Stateful<gpui::Div> {
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

/// THEME_PICKER_KEYS as the platform writes it.
fn shortcut_label() -> &'static str {
    if cfg!(target_os = "macos") { "⌘K ⌘T" } else { "Ctrl+K Ctrl+T" }
}

fn button(t: &Theme, id: &'static str, label: &'static str) -> gpui::Stateful<gpui::Div> {
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
            .on_action(cx.listener(|this, _: &ToggleThemePicker, _, cx| {
                if this.theme_picker.is_some() {
                    this.close_theme_picker(false, cx);
                } else {
                    this.open_theme_picker(cx);
                }
            }))
            .on_key_down(cx.listener(|this, event: &KeyDownEvent, _, cx| {
                let keystroke = &event.keystroke;
                let modifiers = &keystroke.modifiers;
                if modifiers.platform || modifiers.control || modifiers.alt {
                    return;
                }
                if this.theme_picker.is_some() {
                    this.press_in_theme_picker(&keystroke.key, keystroke.key_char.as_deref(), cx);
                } else {
                    this.press(&keystroke.key, cx);
                }
            }))
            .relative()
            .size_full()
            .flex()
            .flex_col()
            .bg(rgb(t.background))
            .child(title_bar::render(t, self.crumbs(), self.render_menu_button(cx), window))
            .child(
                div()
                    .flex_1()
                    .min_h_0()
                    .flex()
                    .flex_col()
                    .items_center()
                    .gap_3()
                    .p_4()
                    .child(
                        div()
                            .flex()
                            .flex_col()
                            .items_center()
                            .child(div().text_3xl().font_weight(FontWeight::BOLD).text_color(rgb(t.heading)).child("WORDLE"))
                            .child(div().text_sm().text_color(rgb(t.subtle)).child(self.status_line())),
                    )
                    .child(self.render_board())
                    .child(footer)
                    .child(self.render_keyboard(cx))
                    .child(self.render_share_button(cx)),
            )
            // While the menu or the theme picker is open, a click anywhere else closes it
            // (they draw above this). Closing the picker this way puts the old theme back.
            .when(self.menu_open || self.theme_picker.is_some(), |root| {
                root.child(
                    div()
                        .id("backdrop")
                        .absolute()
                        .inset_0()
                        .occlude()
                        .on_click(cx.listener(|this, _, _, cx| {
                            this.close_theme_picker(false, cx);
                            this.set_menu_open(false, cx);
                        })),
                )
            })
            .when_some(self.theme_picker.as_ref(), |root, picker| root.child(self.render_theme_picker(picker, cx)))
    }
}

fn main() {
    let game = match Args::parse().and_then(|args| args.first_game()) {
        Ok(game) => game,
        Err(error) => {
            eprintln!("wordle-gpui: {error}");
            std::process::exit(2);
        }
    };

    Application::new().run(move |cx: &mut App| {
        cx.bind_keys([
            KeyBinding::new("secondary-q", Quit, None),
            KeyBinding::new(THEME_PICKER_KEYS, ToggleThemePicker, None),
        ]);
        cx.on_action(|_: &Quit, cx| cx.quit());
        cx.on_window_closed(|cx| cx.quit()).detach();

        let bounds = Bounds::centered(None, size(px(520.), px(880.)), cx);
        cx.open_window(
            WindowOptions {
                window_bounds: Some(WindowBounds::Windowed(bounds)),
                titlebar: Some(title_bar::options()),
                ..Default::default()
            },
            |window, cx| {
                cx.new(|cx| {
                    let app = WordleApp::new(game, cx);
                    window.focus(&app.focus_handle);
                    app
                })
            },
        )
        .unwrap();
        cx.activate(true);
    });
}
