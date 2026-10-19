//! The desktop game: the title bar, the board, the on-screen keyboard and the buttons, drawn with gpui.

mod theme;
mod title_bar;

use std::collections::HashMap;
use std::collections::hash_map::RandomState;
use std::hash::{BuildHasher, Hasher};

use gpui::{
    App, Application, Bounds, ClipboardItem, Context, FocusHandle, FontWeight, KeyBinding,
    KeyDownEvent, SharedString, Window, WindowBounds, WindowOptions, actions, div, prelude::*, px,
    rgb, size,
};
use wordle_gpui::feedback::Mark;
use wordle_gpui::game::{Game, Guess, MAX_GUESSES, MAX_SEED};
use wordle_gpui::words::WORD_LENGTH;

actions!(wordle, [Quit]);

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

struct WordleApp {
    game: Game,
    /// The letters of the Guess being typed, not yet submitted.
    typed: String,
    /// Shown under the board, in a colour: a refused Guess, a cheer, or the Answer after a Loss.
    message: Option<(String, u32)>,
    focus_handle: FocusHandle,
}

impl WordleApp {
    fn new(game: Game, cx: &mut Context<Self>) -> Self {
        Self { game, typed: String::new(), message: None, focus_handle: cx.focus_handle() }
    }

    /// Handle one key, from the real keyboard or a click on the on-screen one.
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
            Err(error) => self.message = Some((error.to_string(), theme::LOVE)),
            Ok(_) => {
                self.typed.clear();
                self.message = if self.game.is_won() {
                    let cheer = CHEERS.get(self.game.guesses().len() - 1).unwrap_or(&"Got there!");
                    Some((cheer.to_string(), theme::FOAM))
                } else if self.game.is_lost() {
                    Some((format!("The answer was {}", self.game.answer().to_uppercase()), theme::LOVE))
                } else {
                    None
                };
            }
        }
    }

    /// Start a new random Game, keeping the Guess Limit unless `max_guesses` changes it.
    fn new_game(&mut self, max_guesses: Option<usize>, cx: &mut Context<Self>) {
        self.game = Game::random(random_seed(), max_guesses);
        self.typed.clear();
        self.message = None;
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
                let (fill, text) = theme::mark_colours(*mark);
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
                let border = if letter.is_some() { theme::MUTED } else { theme::HIGHLIGHT_MED };
                tile(letter, None, border, theme::TEXT)
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
        let unused = (theme::HIGHLIGHT_MED, theme::TEXT);
        let mut rows = Vec::new();
        for (row_index, letters) in KEYBOARD_ROWS.iter().enumerate() {
            let mut keys = Vec::new();
            if row_index == 2 {
                keys.push(self.key(ENTER.into(), "ENTER".into(), unused, px(64.), cx));
            }
            for letter in letters.chars() {
                let colours = known.get(&letter).map_or(unused, |mark| match mark {
                    // An Absent key fades into the background, so the letters still in play stand out.
                    Mark::Absent => (theme::HIGHLIGHT_LOW, theme::MUTED),
                    _ => theme::mark_colours(*mark),
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

    fn render_buttons(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let max_guesses = self.game.max_guesses;
        let other_limit = if max_guesses.is_some() { None } else { Some(MAX_GUESSES) };
        let switch_label = if max_guesses.is_some() { "Play unlimited" } else { "Play classic" };

        let mut buttons = div()
            .flex()
            .justify_center()
            .gap_2()
            .child(button("new-game", "New game").on_click(cx.listener(move |this, _, window, cx| {
                window.focus(&this.focus_handle);
                this.new_game(max_guesses, cx);
            })))
            .child(button("switch-limit", switch_label).on_click(cx.listener(move |this, _, window, cx| {
                window.focus(&this.focus_handle);
                this.new_game(other_limit, cx);
            })));
        if self.game.is_over() {
            buttons = buttons.child(button("share", "Copy share grid").on_click(cx.listener(|this, _, _, cx| {
                cx.write_to_clipboard(ClipboardItem::new_string(this.game.share_grid()));
                this.message = Some(("Copied to the clipboard".into(), theme::SUBTLE));
                cx.notify();
            })));
        }
        buttons
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

fn button(id: &'static str, label: &'static str) -> gpui::Stateful<gpui::Div> {
    div()
        .id(id)
        .px_3()
        .py_1p5()
        .rounded_md()
        .bg(rgb(theme::OVERLAY))
        .border_1()
        .border_color(rgb(theme::HIGHLIGHT_MED))
        .text_color(rgb(theme::TEXT))
        .text_sm()
        .cursor_pointer()
        .hover(|style| style.bg(rgb(theme::HIGHLIGHT_HIGH)))
        .child(label)
}

impl Render for WordleApp {
    fn render(&mut self, window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let mut footer = div().flex().flex_col().items_center().gap_1().h(px(44.));
        if let Some((message, colour)) = &self.message {
            footer = footer.child(div().text_color(rgb(*colour)).font_weight(FontWeight::BOLD).child(message.clone()));
        }
        if self.game.is_over() {
            footer = footer.child(div().text_xs().text_color(rgb(theme::MUTED)).child(self.replay_hint()));
        }

        div()
            .track_focus(&self.focus_handle)
            .on_key_down(cx.listener(|this, event: &KeyDownEvent, _, cx| {
                let modifiers = &event.keystroke.modifiers;
                if !(modifiers.platform || modifiers.control || modifiers.alt) {
                    this.press(&event.keystroke.key, cx);
                }
            }))
            .size_full()
            .flex()
            .flex_col()
            .bg(rgb(theme::BASE))
            .child(title_bar::render(self.crumbs(), window))
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
                            .child(div().text_3xl().font_weight(FontWeight::BOLD).text_color(rgb(theme::ROSE)).child("WORDLE"))
                            .child(div().text_sm().text_color(rgb(theme::SUBTLE)).child(self.status_line())),
                    )
                    .child(self.render_board())
                    .child(footer)
                    .child(self.render_keyboard(cx))
                    .child(self.render_buttons(cx)),
            )
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
        cx.bind_keys([KeyBinding::new("secondary-q", Quit, None)]);
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
