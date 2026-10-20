# gpui desktop app

A second front end for the same game: a native window drawn with [gpui](https://gpui.rs), the UI framework behind the Zed editor. It lives in `app/wordle-gpui/`, a standalone Cargo crate. It doesn't call the Python package; it re-implements the rules in Rust and copies the word lists.

## Running it

From the repo root:

| Command | What it does |
| --- | --- |
| `just wordle-gpui` | Build (release) and open the window with a random Answer |
| `just wordle-gpui --seed 7` | Replay the Answer for Seed 7, the same Answer as `just wordle --seed 7` |
| `just wordle-gpui --answer crane` | Fixed Answer |
| `just wordle-gpui --unlimited` | No Guess Limit |
| `just test-gpui` | `cargo test` for the crate |

It needs Rust 1.89 or newer (a dependency, `uuid`, requires it; the buttons come from gpui-kit's `gpui-base`); `rustup update stable` gets one.

The `justfile` recipes use `[working-directory: 'app/wordle-gpui']`, and set `windows-shell` to PowerShell, so they work on Windows too.

## Layout

The crate is split into layers. Each one only uses the ones above it:

```
app/wordle-gpui/
  data/           the word lists, copied from packages/wordle
  src/
    lib.rs        the library: `engine` and `solver`, usable from tests with no window
    engine/       the game itself: Feedback, the word lists, Seeds, Game, live hints
    solver/       the Feedback matrices and the Strategy that ranks Suggestions
    overlays/     state and keys with no drawing: the command palette, the pickers, the search
    theme/        one file per theme, and the Theme roles
    ui/           drawing: WordleApp (ui/mod.rs) holds the state; every other file draws one part
    main.rs       opens the window; args.rs reads the options, dictionary.rs does the lookups
```

- **`engine/` and `solver/`** are the library, and mirror the Python package's `wordle.engine` and `wordle.solver`. `engine/feedback.rs` and `engine/game.rs` follow [feedback-scoring.md](feedback-scoring.md) and [game-and-state.md](game-and-state.md), and their tests check against values printed by the Python game.
- **`overlays/`** holds plain structs that know nothing about gpui: a key goes in, an outcome comes out (`Outcome::Run(command)`, `Outcome::Close`). That makes them easy to unit-test.
- **`ui/`** turns that state into elements. Each file adds an `impl WordleApp` block that draws one part of the window.

Take the command palette as the example of how the layers fit together:

| Layer | File | What it does |
| --- | --- | --- |
| State and keys | `overlays/commands.rs` | `CommandPalette` holds the query and the highlighted row; `press("down")` moves it, `press("enter")` returns `Outcome::Run(command)` |
| Tests | `overlays/commands_tests.rs` | Types into a `CommandPalette` and checks the outcomes, with no window |
| Drawing | `ui/palette.rs` | Draws a `CommandPalette` as a search field and a list of rows |
| Wiring | `ui/mod.rs` | Sends each real key press to the open overlay, and runs the `Outcome` |

Tests sit next to the code they test as `<name>_tests.rs`, pulled in with `#[cfg(test)] #[path = "commands_tests.rs"] mod tests;`. Everything with state and keys has them; the drawing files don't.

The theme picker (`overlays/theme_picker.rs` and `ui/theme_picker.rs`) and the thread picker for [Precompute matrices](#precompute-matrices) (`overlays/precompute.rs` and `ui/precompute_picker.rs`) follow the same pattern. The [Solver](#solver) panel does its scoring in `solver/strategy.rs` and draws it in `ui/solver_panel.rs`. `Cargo.toml` pulls in gpui, gpui-kit (buttons, icons, shortcut keys), `scraper` and `ureq`.

## Seeds match the Python game

`Game.random(seed)` in Python picks `random.Random(seed).choice(answers)`. `seed.rs` reproduces that exactly: MT19937 seeded with `init_by_array([seed])`, then `_randbelow(n)` (draw `n.bit_length()` bits, reject draws `>= n`). This holds only while both games use the same sorted Answer List, so keep `app/wordle-gpui/data/` and `packages/wordle/src/wordle/data/` identical.

## The window

- Type letters, Backspace and Enter on the real keyboard, or click the on-screen keys. Cmd-Q (Ctrl-Q elsewhere) quits, and so does closing the window.
- A refused Guess shows its reason under the board and doesn't use up a Guess.
- The keyboard colours each letter by the best Mark seen for it (Correct beats Present beats Absent).
- The title bar holds only the hamburger (and the window buttons).
- The status bar along the bottom has the sidebar button on the left, and on the right the Guess Limit (`classic` or `unlimited`), the Seed (or `chosen answer`) with a button that copies it, and the Guesses left (or the Guess count when unlimited).
- After a Win or Loss: a cheer, or "Out of guesses" with the Answer hidden as dots until you click the Eye icon (EyeOff hides it again; the sidebar follows); the `just wordle-gpui ...` command that replays the Game, in a monospace font with a copy icon; and three buttons: **Copy results** (the share grid), **Try this word again** (the same Answer, as the menu's row) and **Play a new word** (a new random Answer, as the menu's row).
- Copying (the seed, the results, the replay command) shows a note in the status bar, next to the sidebar button, that hides itself after 2 seconds.

## Settings menu

The hamburger at the right of the title bar opens a menu. Its rows are the `Command`s in `overlays/commands.rs`, so the menu and the command palette always offer the same things:

Each row is one line: the name on the left and, on the right, a dim detail (the seed, the theme name), a dot for a toggle that is on, or the shortcut drawn as gpui-kit `Kbd` keys (Ctrl+B on Windows and Linux, ⌘B on macOS; a chord such as Ctrl+K Ctrl+T is two keys). The palette uses the same rows.

- **Play a new word:** a new random Answer, keeping the Guess Limit.
- **Try this word again:** the same Game from the start (`Game::restart()`): the same Answer, Seed and Guess Limit, with no Guesses. Works for a chosen Answer (`--answer`) too.
- **Play a seed…:** turns into a seed field. Type or paste (⌘V, Ctrl+V) up to six digits (any number from 0 to 999,999; pasting keeps only the digits), Enter plays that Seed with the current Guess Limit, Escape goes back to the menu. A **Paste seed** button beside it does the same as the paste shortcut. It picks the same Answer as `just wordle --seed N`.
- **Copy seed:** copies the Seed's number to the clipboard. A Game with a chosen Answer has no Seed, so it says so instead.
- **Unlimited guesses:** dotted when the Game has no Guess Limit. Choosing it switches between six Guesses and unlimited and starts a new Game, since changing the limit mid-Game would change whether it can be lost.
- **Live hints:** dotted when on (see below).
- **Show sidebar:** dotted when the sidebar is open (see below).
- **Show solver:** dotted when the solver is open (see [Solver](#solver)).
- **Change theme…:** opens the theme picker (below). The row shows the current theme.
- **Precompute matrices…:** opens a small picker for the thread count (see below).
- **Reset layout:** closes the sidebar and restores the window size.

The menu's last line shows the command palette's shortcut.

While the menu is open, typing doesn't reach the board. Escape or a click anywhere else closes the menu. The menu is drawn with gpui's `deferred(anchored(...))` so it sits above the rest of the window, with a transparent backdrop underneath it that catches the click outside. Both the hamburger and the menu `occlude()`, so on Windows a click on them isn't taken as dragging the title bar.

## Command palette

⌘P (Ctrl+P on Windows and Linux) opens the command palette in the middle of the window. It lists the menu's commands:

- Type to filter by label, with the same loose matching as the theme picker (`ul` finds Unlimited guesses).
- Up and Down move, Enter or a click runs the highlighted command, Escape or a click outside closes it. The shortcut again closes it too.
- **Play a seed…** turns the search field into a seed field: digits, Enter to play, Escape back to the list, and a **Paste seed** button.
- ⌘V (Ctrl+V) pastes into the search field, or the seed field while it shows.

Only one of the menu, the palette and the theme picker is open at a time (`Overlay` in `ui/mod.rs`); opening one closes the others.

## Live hints

With **Live hints** on, the tiles of the Guess being typed show what earlier Guesses already say about each letter, before it is submitted (`engine/hints.rs`):

| Earlier Guesses say | Typed tile |
| --- | --- |
| Correct in this spot | border in the Correct colour |
| In the Answer, but not known to be in this spot | border in the Present colour |
| Absent | faint border, faded letter |
| Nothing (not guessed yet) | the usual border |

Hints use the border, not a fill, so a typed row never looks like a submitted one. They are off by default.

## Sidebar

The button at the left of the status bar, **Show sidebar**, or ⌘B (Ctrl+B) opens a sidebar on the left. The window widens by the sidebar's width (unless it is maximised), so the board keeps its size. The sidebar and the board are "islands" in the style of JetBrains' Island UI: rounded panels on the window colour, with the title bar and status bar flat on it. Drag the strip between the sidebar and the board to resize the sidebar (220 to 520 px wide; the window keeps its size, so the board narrows or widens).

- **Guesses:** each Guess as a row of small tiles, and the Answer after a Loss. Click one to see its meaning. A dot at the right end of a row marks a word that has been looked up already.
- **Meaning:** the picked word in the [Oxford Learner's Dictionaries](https://www.oxfordlearnersdictionaries.com): each part of speech with its pronunciations, then numbered senses with their CEFR level, labels and first example. It scrolls, with a scroll bar from gpui-kit. A word that isn't there shows the site's spelling suggestions.

Nothing is looked up until you click a word, so playing never touches the network. `dictionary.rs` is a Rust port of the Oxford source in the `dictionary-tui` project: it fetches the search page with a browser User-Agent, follows the redirect to the entry, scrapes it with `scraper`, and fetches the other parts of speech listed under "related entries". The lookup blocks, so it runs on gpui's background executor; results (and failures) are kept for the session, and clicking a word whose lookup failed tries again. `cargo test -- --ignored` runs one test against the real site.

## Theme

Ten themes, one file each in `theme/` (`rose_pine.rs`, …). The app starts in Rosé Pine.

| Theme | Appearance | Correct | Present | Absent |
| --- | --- | --- | --- | --- |
| [Rosé Pine](https://rosepinetheme.com/palette/ingredients) | Dark | Pine | Gold | Overlay |
| Rosé Pine Dawn | Light | Pine | Gold | Muted |
| [Catppuccin](https://catppuccin.com/palette) Mocha | Dark | Green | Yellow | Surface 0 |
| Catppuccin Latte | Light | Green | Yellow | Overlay 1 |
| [Flexoki](https://stephango.com/flexoki) Dark | Dark | Green 400 | Yellow 400 | 900 |
| Flexoki Light | Light | Green 600 | Yellow 400 | 500 |
| [Tokyo Night](https://github.com/folke/tokyonight.nvim) | Dark | Green | Yellow | Highlight |
| [Everforest](https://github.com/sainnhe/everforest) | Dark (medium) | Green | Yellow | Bg 1 |
| [Kanagawa](https://github.com/rebelot/kanagawa.nvim) Wave | Dark | Spring green | Carp yellow | Sumi ink 4 |
| [Nord](https://www.nordtheme.com/docs/colors-and-palettes) | Dark | Nord 14 | Nord 13 | Nord 1 |

Each theme is a `Theme` value that maps its palette onto the same roles (`background`, `surface`, `overlay`, `text`, `correct`, `present`, `absent`, `heading`, `error`, `success`, `accent`, …). The UI only uses the roles, so adding a theme means adding a file with one `Theme`, declaring it in `theme/mod.rs` and listing it in `THEMES`. In dark themes an Absent key fades into the background, so the letters still in play stand out; in light themes it matches the Absent tile. Messages under the board store a tone (error, success, info) rather than a colour, so they change colour with the theme.

The chosen theme lasts until the app closes; it isn't saved.

### Theme picker

Open it with **Change theme…** in the settings menu, or with Zed's shortcut, ⌘K ⌘T (Ctrl+K Ctrl+T on Windows and Linux).

- The list has a **Dark** heading and a **Light** heading, with the dark themes first (the order of `THEMES` in `theme/mod.rs`; keep it grouped when adding a theme).
- Type to filter by name. The letters must appear in order but not side by side (`cmo` finds Catppuccin Mocha). Case and accents don't matter (`rose` finds Rosé Pine), and `dark` or `light` filters by appearance.
- Up and Down move through the matches, and each move previews that theme on the whole window. Typing previews the first match.
- Enter or a click keeps the theme. Escape, a click outside, or the shortcut again puts back the theme from before the picker opened.

## Title bar

Like Zed, the app draws its own title bar (`ui/title_bar.rs`):

- **macOS:** the system title bar is transparent (`appears_transparent`) and the traffic lights are moved onto the app's bar. macOS still drags the window by the bar; a double-click does what the system setting says (zoom or minimise).
- **Windows:** the system title bar is hidden and the bar draws minimise, maximise and close with the Segoe Fluent Icons font, as Zed does. `window_control_area` tells Windows which parts drag the window and which are the caption buttons.
- **Linux:** gpui keeps the system title bar, so the app's bar shows under it.

The bar is the theme's `surface` while the window is active and its `background` when it isn't.

## Building on macOS without Xcode

gpui normally compiles its Metal shaders at build time with Xcode's `metal` tool. The `runtime_shaders` feature compiles them when the app starts instead, so the Command Line Tools are enough. The feature does nothing on other platforms.

## Precompute matrices

**Precompute matrices…** (menu or palette; search `matri`) builds the two Feedback matrices the Python package builds with `just matrices`, as the same `.npy` files in `matrices/` at the repo root. See [feedback-matrices.md](feedback-matrices.md) for what they hold.

- A picker asks how many threads to use: 1, 2, 4 or 8. Up and Down move (typing 1, 2, 4 or 8 jumps to it), Enter or a click starts, Escape goes back. It starts on the largest choice the machine has cores for.
- The work runs on gpui's background executor, so the window stays usable. The status bar says "Precomputing matrices on 4 threads…", then "Saved the matrices to matrices/ in 1.2s (4 threads)" or the error. Starting it again while it runs only says so.
- Existing files are replaced without asking (the terminal command asks first).
- `solver/matrix.rs` has the logic, with no window: `pack` scores one pair without allocating, `score_matrix` splits the Guess rows into one block per thread with `std::thread::scope`, and `npy_bytes` writes the file (a 64-byte-aligned header, as numpy does). A test checks `pack` against `feedback`, and the output is byte-for-byte identical to the Python package's files.

## Solver

**Show solver**, the panel button at the right end of the status bar, or ⌘⌥B (Ctrl+Alt+B, Zed's right dock) opens the solver on the right. Like the sidebar, the window widens by its width so the board keeps its size.

It ranks Suggestions by Expected Information: how many bits a Guess is expected to tell us about the Answer, averaged over its Feedback Split (`-Σ p·log2 p`, with every Candidate equally likely). Before the first Guess the top one is the best Opener. The scoring is in `solver/strategy.rs`; the panel is `ui/solver_panel.rs`.

Two settings change what is searched:

| Setting | Choice | Guesses tried |
| --- | --- | --- |
| **Words** (the matrix set) | Answers | Answer List words, read from `answers_vs_answers.npy` |
| | Valid guesses | Every Guess List word, read from `guesses_vs_answers.npy` |
| **Search** (the mode) | Candidates | Only words that could still be the Answer |
| | All words | Every word in the set, even ruled-out ones, which can split the Candidates better |

- **Suggestions:** the top eight, each with its bits and the Candidates expected to be left (`Σ n²/N`). A dot in the Correct colour marks a word that could be the Answer, so guessing it might win now. Ties go to such a word.
- **Candidates:** their count, and the words themselves once six or fewer are left.
- **Chart:** click a Suggestion, or type any Guess List word into **Search a word to chart…**, to see its Feedback Split as horizontal bars. Each bar is one Feedback, drawn as its five Marks in the theme's colours, as long as the number of Candidates that would give it (the Win bar is in the Correct colour). The title gives the expected number of words left and the bits. Every group is drawn, biggest first, in a box that scrolls once it is taller than 320 px. **Type it** puts the word on the board.
- **Search field:** a click sends the keys there instead of the board. Enter, Escape or a click on the board sends them back. ⌘V (Ctrl+V) pastes letters into it.

The matrices are read from `matrices/` (see [feedback-matrices.md](feedback-matrices.md)) the first time a set is used, on a background thread, and kept until the app closes. If they're missing or don't match the word lists, the panel says so and offers **Precompute matrices…**; when that finishes the panel reads them again. Ranking runs on a background thread, split across the cores: the full Valid guesses × All words search is 14,855 × 2,315 cells. The chart needs no matrix: it scores its word against the Candidates directly.

The chart is drawn with plain elements rather than gpui-kit's `BarChart`, so each bar's label can be the five coloured Marks and every colour comes from the app's theme.
