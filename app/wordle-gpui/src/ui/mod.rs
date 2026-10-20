//! The window: the title bar and its settings menu, the sidebar, the board and the on-screen
//! keyboard, the status bar, and the command palette and theme picker that float above them.
//! In Solver mode the board is replaced by one whose Feedback is clicked in by hand (`ui/assist.rs`),
//! and while a precompute runs (and after, until the player goes back) by the precompute view
//! (`ui/precompute_view.rs`).
//!
//! `WordleApp` holds the state and routes keys; each submodule draws one part of it.

mod assist;
mod board;
mod guess_counts_picker;
mod menu;
mod palette;
mod precompute_picker;
mod precompute_view;
mod sidebar;
mod solver_panel;
mod status_bar;
mod theme_picker;
pub mod title_bar;
mod widgets;

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use gpui::{App, ClipboardItem, Context, FocusHandle, FontWeight, KeyBinding, KeyDownEvent, Keystroke, ScrollHandle, SharedString, UniformListScrollHandle, Window, actions, div, prelude::*, px, rgb};
use wordle_gpui::engine::game::{Game, Guess, MAX_GUESSES, random_seed};
use wordle_gpui::solver::assist::Assist;
use wordle_gpui::solver::guess_count_matrix;
use wordle_gpui::solver::matrix;
use wordle_gpui::solver::strategy::{Matrix, MatrixSet, Strategy};
use wordle_gpui::engine::words::{WORD_LENGTH, word_lists};

use crate::overlays::commands::{self, Command, CommandPalette, SeedField, SeedOutcome};
use crate::overlays::guess_counts::{self as guess_counts_state, GuessCountPicker, StopOutcome};
use crate::overlays::precompute::{self, ThreadPicker};
use crate::overlays::precompute_run::{self, Area, Kind, RunState};
use crate::overlays::theme_picker::{self as theme_picker_state, ThemePicker};
use crate::theme::{self, Theme};
use board::{BACKSPACE, ENTER};
use widgets::IconName;
use sidebar::Meaning;
use solver_panel::SolverState;

actions!(wordle, [Quit, Paste, ToggleCommandPalette, ToggleSidebar, ToggleSolver, ToggleThemePicker]);

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
/// Zed's shortcut for its right dock.
pub const SOLVER_SHORTCUT: Shortcut = Shortcut { keys: "secondary-alt-b" };
/// Zed's shortcut for its theme picker.
pub const THEME_PICKER_SHORTCUT: Shortcut = Shortcut { keys: "secondary-k secondary-t" };

pub fn bind_keys(cx: &mut App) {
    cx.bind_keys([
        KeyBinding::new("secondary-q", Quit, None),
        KeyBinding::new("secondary-v", Paste, None),
        KeyBinding::new(PALETTE_SHORTCUT.keys, ToggleCommandPalette, None),
        KeyBinding::new(SIDEBAR_SHORTCUT.keys, ToggleSidebar, None),
        KeyBinding::new(SOLVER_SHORTCUT.keys, ToggleSolver, None),
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
    /// Chooses the threads and the Strategies of a Guess Count Matrix run.
    GuessCounts(GuessCountPicker),
    /// Offers to stop the Guess Count Matrix run that is going on.
    StopGuessCounts,
}

/// A precompute (the Feedback matrices or the Guess Count Matrices) running in the background, or
/// ended and still shown in the precompute view.
struct PrecomputeRun {
    /// Its progress and log, filled in from the worker threads (see `overlays/precompute_run.rs`).
    state: Arc<Mutex<RunState>>,
    started: Instant,
    /// Set to stop a Guess Count run; finished rows are kept. None for the matrices.
    stop: Option<Arc<AtomicBool>>,
    /// The log's scroll position. It follows the newest line while it is at the end.
    log_scroll: UniformListScrollHandle,
    /// Log lines seen at the last draw (dropped ones included), to tell when new ones came.
    lines_seen: usize,
}

impl PrecomputeRun {
    fn new(state: RunState, stop: Option<Arc<AtomicBool>>) -> Self {
        Self { state: Arc::new(Mutex::new(state)), started: Instant::now(), stop, log_scroll: UniformListScrollHandle::new(), lines_seen: 0 }
    }

    fn state(&self) -> std::sync::MutexGuard<'_, RunState> {
        self.state.lock().expect("the precompute state lock")
    }
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
    /// The solver on the right: its settings, its Suggestions and the chart for the word picked.
    solver: SolverState,
    /// Solver mode, while it is on: the State of a game played elsewhere, entered by hand.
    assist: Option<Assist>,
    overlay: Option<Overlay>,
    /// The precompute going on, or ended and still shown in place of the board.
    precompute: Option<PrecomputeRun>,
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
            solver: SolverState::default(),
            assist: None,
            overlay: None,
            precompute: None,
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

    /// The State on screen: the one entered in Solver mode, or else the Game's.
    fn shown_guesses(&self) -> &[Guess] {
        match &self.assist {
            Some(assist) => &assist.guesses,
            None => self.game.guesses(),
        }
    }

    /// Which precompute is running, if one is (an ended one still shown is not).
    fn running_precompute(&self) -> Option<Kind> {
        self.precompute.as_ref().map(|run| run.state()).filter(|state| state.is_running()).map(|state| state.kind)
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
        self.solver.searching = false;
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
            Command::ToggleSolver => {
                self.dismiss(cx);
                self.toggle_solver(window, cx);
            }
            Command::ToggleSolverMode => {
                self.dismiss(cx);
                self.toggle_solver_mode(window, cx);
            }
            Command::ChangeTheme => self.open(Overlay::ThemePicker(ThemePicker::new(self.theme)), cx),
            Command::Precompute if self.running_precompute() == Some(Kind::Matrices) => {
                self.dismiss(cx);
                self.show_status("Already precomputing the matrices", cx);
            }
            Command::Precompute if self.running_precompute() == Some(Kind::GuessCounts) => {
                self.dismiss(cx);
                self.show_status("Stop the guess counts first: they read the matrices", cx);
            }
            Command::Precompute => self.open(Overlay::Precompute(ThreadPicker::default()), cx),
            Command::PrecomputeGuessCounts if self.running_precompute() == Some(Kind::GuessCounts) => self.open(Overlay::StopGuessCounts, cx),
            Command::PrecomputeGuessCounts if self.running_precompute() == Some(Kind::Matrices) => {
                self.dismiss(cx);
                self.show_status("Wait for the matrices to finish precomputing", cx);
            }
            Command::PrecomputeGuessCounts if !matrix::default_dir().join(MatrixSet::ValidGuesses.file()).exists() => {
                self.dismiss(cx);
                self.show_status_for("The Feedback matrices are missing: run Precompute matrices… first", Duration::from_secs(5), cx);
            }
            Command::PrecomputeGuessCounts => self.open(Overlay::GuessCounts(GuessCountPicker::default()), cx),
            Command::ResetLayout => {
                self.dismiss(cx);
                self.assist = None;
                self.sidebar_open = false;
                self.solver.open = false;
                self.sidebar_width = sidebar::DEFAULT_WIDTH;
                if !window.is_maximized() && !window.is_fullscreen() {
                    window.resize(gpui::size(px(520.), px(980.)));
                }
            }
        }
        cx.notify();
    }

    /// Score every Guess against every Answer on `threads` threads, off the window's thread, and
    /// save the two Feedback matrices (see `solver/matrix.rs`). The precompute view shows it.
    fn start_precompute(&mut self, threads: usize, cx: &mut Context<Self>) {
        self.overlay = None;
        let lists = word_lists();
        let run = PrecomputeRun::new(RunState::matrices(threads, lists.guesses.len(), lists.answers.len()), None);
        let (state, started) = (run.state.clone(), run.started);
        self.precompute = Some(run);
        let events = state.clone();
        let work = cx.background_spawn(async move {
            let report = move |event| events.lock().expect("the precompute state lock").apply_matrix(event, started.elapsed());
            let saved = matrix::build_with(&matrix::default_dir(), threads, &report);
            (saved, started.elapsed())
        });
        self.redraw_while_running(cx);
        cx.spawn(async move |this, cx| {
            let (saved, elapsed) = work.await;
            this.update(cx, |app, cx| {
                app.reload_matrices(cx);
                state.lock().expect("the precompute state lock").finish_matrices(&saved, elapsed);
                cx.notify();
            })
            .ok();
        })
        .detach();
        cx.notify();
    }

    /// Fill the Guess Count Matrices of `strategies` on `threads` threads, off the window's thread
    /// (see `solver/guess_count_matrix.rs`), resuming rows left unfinished. The precompute view
    /// shows its progress and log.
    fn start_guess_counts(&mut self, threads: usize, strategies: Vec<&'static Strategy>, cx: &mut Context<Self>) {
        self.overlay = None;
        let stop = Arc::new(AtomicBool::new(false));
        let run = PrecomputeRun::new(RunState::guess_counts(threads, &strategies, word_lists().guesses.len()), Some(stop.clone()));
        let (state, started) = (run.state.clone(), run.started);
        self.precompute = Some(run);
        let events = state.clone();
        let work = cx.background_spawn(async move {
            // One lock per finished row (a row takes about 0.1 s of a thread), none per Answer.
            let report = move |event| events.lock().expect("the precompute state lock").apply_guess_counts(event, started.elapsed());
            let result = Matrix::load(&matrix::default_dir(), MatrixSet::ValidGuesses).map_err(guess_count_matrix::BuildError::Io).and_then(|feedback| {
                let options = guess_count_matrix::Options { threads, strategies, openers: None, events: &report, stop: &stop };
                guess_count_matrix::build(&guess_count_matrix::default_dir(), &feedback, options)
            });
            (result, started.elapsed())
        });
        self.redraw_while_running(cx);
        cx.spawn(async move |this, cx| {
            let (result, elapsed) = work.await;
            this.update(cx, |app, cx| {
                state.lock().expect("the precompute state lock").finish_guess_counts(&result, elapsed);
                if matches!(app.overlay, Some(Overlay::StopGuessCounts)) {
                    app.overlay = None;
                }
                // The run rewrote summary.json, finished or stopped.
                app.reload_summary(cx);
                cx.notify();
            })
            .ok();
        })
        .detach();
        cx.notify();
    }

    /// Redraw the precompute view twice a second while its run goes on.
    fn redraw_while_running(&self, cx: &mut Context<Self>) {
        cx.spawn(async move |this, cx| {
            loop {
                cx.background_executor().timer(Duration::from_millis(500)).await;
                let running = this.update(cx, |app, cx| {
                    cx.notify();
                    app.running_precompute().is_some()
                });
                if !matches!(running, Ok(true)) {
                    break;
                }
            }
        })
        .detach();
    }

    /// Ask the Guess Count Matrix run to stop; it keeps the rows it has finished.
    fn stop_guess_counts(&mut self, cx: &mut Context<Self>) {
        self.overlay = None;
        if let Some(run) = &self.precompute
            && let Some(stop) = &run.stop
            && run.state().can_stop()
        {
            stop.store(true, Ordering::Relaxed);
            run.state().ask_stop(run.started.elapsed());
        }
        cx.notify();
    }

    /// Close the precompute view once its run has ended: the game shows again, as it was.
    fn back_to_game(&mut self, cx: &mut Context<Self>) {
        if self.running_precompute().is_none() {
            self.precompute = None;
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
            None if self.solver.searching => return self.solver_key(key, cx),
            // The precompute view hides the board: keys never reach it.
            None if self.precompute.is_some() => {
                if self.precompute.as_ref().is_some_and(|run| run.state().press(key) == precompute_run::Outcome::BackToGame) {
                    self.back_to_game(cx);
                }
                return;
            }
            None => return self.board_key(key, cx),
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
            Some(Overlay::GuessCounts(picker)) => match picker.press(key) {
                guess_counts_state::Outcome::Run { threads, strategies } => self.start_guess_counts(threads, strategies, cx),
                guess_counts_state::Outcome::Cancel => self.dismiss(cx),
                guess_counts_state::Outcome::None => {}
            },
            Some(Overlay::StopGuessCounts) => match guess_counts_state::stop_key(key) {
                StopOutcome::Stop => self.stop_guess_counts(cx),
                StopOutcome::KeepGoing => self.dismiss(cx),
                StopOutcome::None => {}
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
            None if self.solver.searching => self.solver_paste(&text),
            _ => return,
        }
        cx.notify();
    }

    /// A key for the board, from the real keyboard or a click on the on-screen one: to Solver
    /// mode's board while it is on, or else to the Game.
    fn board_key(&mut self, key: &str, cx: &mut Context<Self>) {
        match self.assist.as_mut() {
            Some(assist) => {
                if assist.press(key) {
                    self.refresh_solver(cx);
                }
                cx.notify();
            }
            None => self.press(key, cx),
        }
    }

    /// Handle one key on the Game's board.
    fn press(&mut self, key: &str, cx: &mut Context<Self>) {
        if self.game.is_over() {
            return;
        }
        match key {
            ENTER => {
                let before = self.game.guesses().len();
                self.submit();
                if self.game.guesses().len() != before {
                    self.refresh_solver(cx);
                }
            }
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

    /// Switch to `game` and close the menu or palette. This leaves Solver mode, to play it.
    fn play(&mut self, game: Game, cx: &mut Context<Self>) {
        self.game = game;
        self.assist = None;
        self.typed.clear();
        self.message = None;
        self.answer_shown = false;
        self.selected_word = None;
        self.dismiss(cx);
        self.solver.selected = None;
        self.refresh_solver(cx);
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
        self.follow_precompute_log();

        div()
            .track_focus(&self.focus_handle)
            .on_action(cx.listener(|this, _: &Paste, _, cx| this.paste(cx)))
            .on_action(cx.listener(|this, _: &ToggleCommandPalette, _, cx| this.toggle_palette(cx)))
            .on_action(cx.listener(|this, _: &ToggleSidebar, window, cx| this.toggle_sidebar(window, cx)))
            .on_action(cx.listener(|this, _: &ToggleSolver, window, cx| this.toggle_solver(window, cx)))
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
            // In Solver mode the board is the one whose Feedback is clicked in, beside the solver.
            .child(
                div()
                    .flex()
                    .flex_1()
                    .min_h_0()
                    .px_2()
                    .pb_1()
                    .when(self.sidebar_open, |row| row.child(self.render_sidebar(cx)).child(self.render_sidebar_handle(cx)))
                    .map(|row| match (precompute_run::main_area(self.precompute.is_some(), self.assist.is_some()), &self.assist) {
                        (Area::Precompute, _) => row.child(self.render_precompute_view(cx)),
                        (Area::SolverMode, Some(assist)) => row.child(self.render_assist(assist, cx)),
                        _ => row.child(self.render_game(cx)),
                    })
                    .when(self.solver.open, |row| row.child(div().flex_none().w(solver_panel::GAP)).child(self.render_solver(cx))),
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
                Some(Overlay::GuessCounts(picker)) => root.child(self.render_guess_counts_picker(picker, cx)),
                Some(Overlay::StopGuessCounts) => root.child(self.render_stop_guess_counts(cx)),
                _ => root,
            })
    }
}

impl WordleApp {
    /// The Game's island: the board, its messages, the keyboard and the buttons for after the end.
    fn render_game(&self, cx: &mut Context<Self>) -> impl IntoElement {
        let t = self.theme;
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
            .child(self.render_end_buttons(cx))
            .on_mouse_down(gpui::MouseButton::Left, cx.listener(|this, _, _, cx| this.leave_solver_search(cx)))
    }

    /// Clicking the board leaves the solver's search field, so typing goes to the board again.
    pub(super) fn leave_solver_search(&mut self, cx: &mut Context<Self>) {
        if self.solver.searching {
            self.solver.searching = false;
            cx.notify();
        }
    }
}
