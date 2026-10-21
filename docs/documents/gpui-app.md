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
    solver/       the Feedback matrices, the Strategy that ranks Suggestions, the tree play, the
                  Guess Count Matrix and the reader of its summary, and Solver mode's State
    overlays/     state and keys with no drawing: the command palette, the pickers, the search,
                  the precompute view's progress and log
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

The theme picker (`overlays/theme_picker.rs` and `ui/theme_picker.rs`) the thread picker for [Precompute matrices](#precompute-matrices) (`overlays/precompute.rs` and `ui/precompute_picker.rs`) the picker for [Precompute guess counts](#precompute-guess-counts) (`overlays/guess_counts.rs` and `ui/guess_counts_picker.rs`) and the [precompute view](#the-precompute-view) (`overlays/precompute_run.rs` and `ui/precompute_view.rs`) follow the same pattern. The [Solver](#solver) panel does its scoring in `solver/strategy.rs` and draws it in `ui/solver_panel.rs`. `Cargo.toml` pulls in gpui, gpui-kit (buttons, icons, shortcut keys), `scraper`, `ureq` and `serde_json` (with `preserve_order`, for the Guess Count Matrix's `manifest.json` and `summary.json`; gpui already depends on it).

## Seeds match the Python game

`Game.random(seed)` in Python picks `random.Random(seed).choice(answers)`. `seed.rs` reproduces that exactly: MT19937 seeded with `init_by_array([seed])`, then `_randbelow(n)` (draw `n.bit_length()` bits, reject draws `>= n`). This holds only while both games use the same sorted Answer List, so keep `app/wordle-gpui/data/` and `packages/wordle/src/wordle/data/` identical.

## The window

- Type letters, Backspace and Enter on the real keyboard, or click the on-screen keys. Cmd-Q (Ctrl-Q elsewhere) quits, and so does closing the window.
- A refused Guess shows its reason under the board and doesn't use up a Guess.
- The keyboard colours each letter by the best Mark seen for it (Correct beats Present beats Absent).
- The title bar holds only the hamburger (and the window buttons).
- The status bar along the bottom has the sidebar button on the left, and on the right the Guess Limit (`classic` or `unlimited`), the Seed (or `chosen answer`) with a button that copies it, and the Guesses left (or the Guess count when unlimited).
- After a Win or Loss: a cheer, or "Out of guesses" with the Answer hidden as dots until you click the Eye icon (EyeOff hides it again; the sidebar follows); the `just wordle-gpui ...` command that replays the Game, in a monospace font with a copy icon; and three buttons: **Copy results** (the share grid), **Try this word again** (the same Answer, as the menu's row) and **Play a new word** (a new random Answer, as the menu's row).
- Copying (the seed, the results, the replay command) shows a note in the status bar, next to the sidebar button, that hides itself after 2 seconds. A precompute's progress and end message are not there: the [precompute view](#the-precompute-view) shows them.

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
- **Solver mode:** dotted while it is on (see [Solver mode](#solver-mode)).
- **Change theme…:** opens the theme picker (below). The row shows the current theme.
- **Precompute matrices…:** opens a small picker for the thread count (see below). The row says `running` while they are precomputed.
- **Precompute guess counts…:** opens a picker for the thread count and the Strategies, or, while a run goes on (the row says `running`), offers to stop it (see below).
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

**Precompute matrices…** (menu or palette; search `matri`) builds the two Feedback matrices the Python package builds with `just precompute`, as the same `.npy` files, into the repo-root `precompute-cache/feedback/` (gitignored), the folder the package and the backend use too: both write byte-identical files. See [feedback-matrices.md](feedback-matrices.md) for what they hold.

- A picker asks how many threads to use: 1, 2, 4 or 8. Up and Down move (typing 1, 2, 4 or 8 jumps to it), Enter or a click starts, Escape goes back. It starts on the largest choice the machine has cores for.
- The work runs on gpui's background executor, so the window stays usable, and the [precompute view](#the-precompute-view) takes the board's place: a line per matrix (`guesses_vs_answers.npy` then `answers_vs_answers.npy`, with its rows done), and a log with the settings, each matrix started and saved (shape, size, path), and "Saved the matrices to precompute-cache/feedback/ in 1.2s (4 threads)" or the error. It has no Stop (it takes about a second). Starting it again while it runs says so in the status bar; so does starting it while guess counts run (they read the matrices).
- `matrix::build_with` reports `Event`s (`Started`, `Rows` every 256 rows a thread scores and when its block ends, `Saved`); `build` is the same with no reports.
- Existing files are replaced without asking (the terminal command asks first).
- `solver/matrix.rs` has the logic, with no window: `pack` scores one pair without allocating, `score_matrix` splits the Guess rows into one block per thread with `std::thread::scope`, and `npy_bytes` writes the file (a 64-byte-aligned header, as numpy does). A test checks `pack` against `feedback`, and the output is byte-for-byte identical to the Python package's files.

## Precompute guess counts

**Precompute guess counts…** (menu or palette; search `guess count`) fills the [Guess Count Matrices](guess-count-matrix.md) of the eight Strategies in the repo-root `precompute-cache/guess-counts/`: the same format version 2 files as `just precompute-guess-counts` writes, in the same folder (`manifest.json`, `summary.json`, and `bits/` and `expected/` with a `<pool>-<scope>.npy` and `<pool>-<scope>.ranking.csv` per Strategy; an Answer List matrix has 2,315 rows, a Guess List one 14,855). The format is the same (the files are compared byte for byte in the tests; only the manifest's `tool` differs), so the app resumes rows the Python command left unfinished, and the other way round.

- It needs `guesses_vs_answers.npy`; if the Feedback matrices are missing the status bar says to run **Precompute matrices…** first; while they are being precomputed it says to wait for them.
- The picker has the thread count as four chips (1, 2, 4, 8; Left and Right or typing the number change it; it starts on the largest the machine has cores for) and the eight Strategies as toggles (id and display name, in the order of `STRATEGIES`), all on (Up and Down move, Space or a click toggles). Enter or **Start** runs, Escape goes back. With no Strategy on, Enter does nothing.
- The work runs on gpui's background executor, and the [precompute view](#the-precompute-view) takes the board's place, with a line per chosen Strategy (its id, its rows done out of its Guess Pool's 2,315 or 14,855, and `waiting`, `running`, `finished`, `stopped` or `not started`).
- Only rows that are not finished are played, so a run resumes rows left by an earlier run of either tool; finished rows are kept. There is no start over in the app (the terminal command has `--fresh`). A matrix with rows that `manifest.json` does not vouch for stops the run before anything is written, with "Can't resume <id>: <reason>. Delete precompute-cache/guess-counts/ to start it over". A version 1 folder (flat `<old id>.npy` files, as the app wrote before) is refused before anything is written, even for a Strategy with no rows, with "Can't use precompute-cache/guess-counts/: manifest.json was written by format version 1; migrate it with `just migrate-guess-counts`".
- The view's **Stop**, or running the command again (which opens "Stop precomputing guess counts?": Enter or **Stop** stops, Escape or **Keep going** closes it), stops the run: each thread drops the Opener it is playing; finished rows are kept, and the summary is still written.
- When it ends the log's last line says "Saved guess counts to precompute-cache/guess-counts/ in 31 min 20s (14,855 rows, 8 threads)", "Stopped guess counts after 2 min 05s: 1,024 rows kept in precompute-cache/guess-counts/. Run it again to resume", or the error (a manifest mismatch says to delete `precompute-cache/guess-counts/` to start over).

The logic is in the library, with no window:

- `solver/guess_counts.rs`: `Player` is the tree play of `guess_counts.py` over the Guess × Answer matrix, one per thread, with its own next-Guess cache (Candidate Set → Guess, per Strategy). Its search for the next Guess is `strategy::suggest`'s ranking on one thread without sorting every word: it keeps the best row by the same keys, compares Expected Candidates as the exact integer Σ n², and works out the bits only when they count. Bits are summed in numpy's pairwise order (`numpy_sum`, and `sparse_numpy_sum` that skips the empty Feedback groups), so they equal the Python Solver's to the last bit and ties break the same way.
- `solver/guess_count_matrix.rs`: `build(dir, feedback, Options { threads, strategies, openers, events, stop })` refuses a folder of another format version (`folder_mismatch`, `BuildError::Folder`), checks the manifest, writes it (format version 2: `rows` per Guess Pool, each Strategy's `path`), reports each Strategy's plan (`Event::Planned`: rows already finished, rows to fill), then for each Strategy opens (or creates, full of zeros, with its Ranking's folder) the `.npy` at its `path`, one row per word of its Guess Pool (`pool_words`), lists the unfinished rows, and has the threads take chunks of 8 consecutive rows from a shared counter. A row is written (zeroed, then its counts, at `128 + row × 2,315`) through one shared file handle once its Opener is fully played; the file is synced every 10 s and at the end of the pass. `events` gets `PassStarted`, `RowDone` (the Opener, the pass's rows done, the row's Average Guess Count and Losses) after each row is written and outside the file's lock, `Flushed` after each sync, and `PassEnded`; a row takes about 0.1 s of a thread, so a report per row costs nothing that shows. Then `write_summary` rewrites `summary.json` and the CSVs from the whole files, each Strategy ranking the Openers of its own rows. With `openers` it fills only those rows, and only if unfinished (the Python `--opener` plays them again); an Opener not in a Strategy's Guess Pool is skipped for that Strategy, as in Python, and a word on no list is an error (`BuildError::UnknownOpener`; Python skips it silently).
- Tests (`guess_counts_tests.rs`, `guess_count_matrix_tests.rs`): the next Guess equals `suggest`'s top word for many Candidate Sets under each of the eight Strategies; rows equal playing each Game alone; rows equal the Python command's rows (`WORDLE_PYTHON_GUESS_COUNTS=<folder>` or `precompute-cache/guess-counts/` when its manifest says Python wrote it, else skipped), and with that variable every Strategy must have rows, the summary and all eight CSVs equal the Python command's byte for byte, and the folder resumed by the app (one finished row of each matrix cleared and played again) is Python's again byte for byte but the manifest's `tool`; an Answer List matrix is 2,315 × 2,315, skips Openers off the Answer List, and its rows equal those rows of the Guess List matrix; a version 1 folder is refused with nothing written; the manifest's exact version 2 bytes; rows not asked for stay zero; finished rows are kept and unfinished ones played again; 1 and 4 threads write identical files; the stop flag keeps finished rows; the events of a resumed two-Strategy run come in order (plan, then each pass's start, rows and end); a manifest mismatch writes nothing; the ranking of a hand-filled matrix (both tie-breaks, a Loss, an unfinished row left out). `measure_a_build` (ignored) times a run; see [Cost](guess-count-matrix.md#cost).

## The precompute view

While **Precompute matrices…** or **Precompute guess counts…** runs, the board's island shows the precompute view instead (in Solver mode too); the Game and Solver mode's State are kept underneath, untouched, and show again when the player goes back. The view stays after the run ends (finished, stopped or failed), with the final progress and the log, until **Back to game**, Enter or Escape. While it shows, keys never reach the hidden board, and the Solver panel's **Type it** is hidden. The status bar shows nothing about the run.

- **Header:** the run's name and its state (`running`, `stopping…`, `finished`, `stopped`, `failed`), with **Stop** while a guess counts run can be stopped, or **Back to game** once it has ended.
- **Progress:** an overall bar (rows done out of rows across the items; a resumed guess counts run starts at the rows already finished), the rate (rows per second over the item going on) and the time left (all rows still to do at that rate, so it shifts when a faster or slower Strategy's pass starts), and once ended the time it took. Then a line per item (a matrix, or a chosen Strategy) with a thin bar, its rows done out of its rows, and its state.
- **Log:** lines with their time since the run started (`00:02:05`), newest at the bottom, in the theme's colours by kind (finished rows dimmer, saves in the success colour, a stop in the Present colour, errors in the error colour). It follows the newest line while scrolled to the end; scroll up to read and it stays put. A guess counts run logs its settings (Strategies, threads, folder), each pass starting (rows already done, rows to fill), each finished Opener (`bits-guesses-all salet: 3.421 Guesses on average, no Losses`), each flush to disk (every 10 s), a stop asked for, each pass ending and the end. A full run would write 68,680 row lines (2 × (2 × 2,315 + 2 × 14,855)), so the log shows only the last 1,000 (`MAX_LOG_LINES`) and says how many earlier lines it dropped. Within a line, Strategy ids are drawn in the accent colour, Openers in bold in the Correct colour, numbers in the Present colour and file names and folders muted (`precompute_run::highlights` finds them; an error line keeps its one colour). It is drawn with gpui's `uniform_list`, so only the lines in view are built.

`overlays/precompute_run.rs` has the logic, with no window: `RunState::matrices` or `RunState::guess_counts` starts it with the settings line, `apply_matrix` and `apply_guess_counts` take the library's events with the time since the start, `ask_stop`, `finish_matrices` and `finish_guess_counts` end it, and `progress_line`, `rate`, `time_left`, `press` (Enter or Escape go back only once ended) and `main_area` (what fills the middle of the window) are read by `ui/precompute_view.rs`. The worker threads apply events to a shared `Mutex<RunState>` (one lock per finished row, none per Answer), and the window redraws twice a second while the run goes on. `precompute_run_tests.rs` checks the progress from a sequence of events (a resume, per-Strategy counts, threads reporting out of order, the rate and time left, finished, stopped and failed ends, a manifest mismatch), the log line of each kind of event, the log's bound, the keys, and that a Game's State is the same after a run is shown and closed.

## Solver

**Show solver**, the panel button at the right end of the status bar, or ⌘⌥B (Ctrl+Alt+B, Zed's right dock) opens the solver on the right. Like the sidebar, the window widens by its width so the board keeps its size.

It ranks Suggestions by Expected Information (how many bits a Guess is expected to tell us about the Answer, averaged over its Feedback Split: `-Σ p·log2 p`, with every Candidate equally likely) or by Expected Candidates (the expected size of the next Candidate Set, `Σ n²/N`, fewer is better). Before the first Guess the top one is the best Opener, ranked over the whole Guess Pool whatever **Search Scope** says (`SearchMode::for_guess`, as the Python package's `benchmark.best_opener`): the Search Scope applies from the second Guess on. The scoring is in `solver/strategy.rs`; the panel is `ui/solver_panel.rs`.

Three settings make up a Strategy, named as in the glossary and the website's Strategy picker. Each is a row of joined buttons with its label above it (beside it, the Ranking's two names would not fit in the panel's 340 px):

| Setting | Choice | Guesses tried |
| --- | --- | --- |
| **Guess Pool** | Answer List | Answer List words, read from `answers_vs_answers.npy` |
| | Guess List | Every Guess List word, read from `guesses_vs_answers.npy` |
| **Search Scope** (from the second Guess on) | Candidates only | Only words that could still be the Answer |
| | All words | Every word in the Guess Pool, even ruled-out ones, which can split the Candidates better |
| **Ranking** | Expected Information | Most Expected Information first |
| | Expected Candidates | Fewest Expected Candidates first |

Every combination is one of the Python package's eight Strategies (see [Solver Strategy](solver-strategy.md#the-eight-strategies)), and the panel names it under the settings ("Strategy: Expected Information, Answer List, All words"). The id is `<ranking>-<pool>-<scope>`, such as `bits-answers-candidates` or `expected-guesses-all`. With Candidates only, the Answer List and the Guess List differ only in the Opener (after it, every Candidate is on the Answer List). `STRATEGIES` (with each id, display name and Guess Count Matrix `path`) and `Strategy::named` in `solver/strategy.rs` list them; the note under the settings says the Opener tries the whole Guess Pool before the first Guess.

The order is the Python Solver's (`Solver.rank`), tested against values it printed: compare the ranked measure rounded to nine decimals (as `np.round` does, ties to even), then a Candidate before a non-Candidate, then the other measure (also rounded), then alphabetical order. With two Candidates or fewer left, only Candidates are tried whatever **Search Scope** says (`Solver.suggest`).

With **Candidates only**, word families such as _ATCH or GRA_E can take seven or eight Guesses; [solver-strategy.md](solver-strategy.md

From top to bottom the panel shows the settings, the Path, the Candidates, the best guess and then the search field with its chart.

- **Path** (once a Guess is made; folded down to its heading at first, click the heading to open it): **Start**, then each Guess as small Feedback tiles, each step with the Candidates left after it. Clicking a step shows the whole panel as it was after that many Guesses: its Candidates, Suggestions (the Opener's at Start, with their Average Guess Counts), and the chart of the Guess made next, so you see how it split them and where it ranked. The best guess heading says "BEST GUESS AFTER GUESS N", clicking the last step returns, and **Type it** hides while an earlier step shows. The Path is recorded on every refresh (`path`, `path_left` and `step` in `SolverState`); any change to the Guesses (a new Guess, a new Game, a Mark clicked in Solver mode) goes back to the latest step. It covers the current Game or Solver mode State only; nothing is kept across Games.

- **Candidates:** every word that could still be the Answer, with their count. They are laid out as a grid of cells, five to a row, in a box five rows tall that scrolls, greyed when there are more than 10 and in the text colour when 10 or fewer; a `uniform_list` draws only the rows in view, so the 2,315 Candidates before the first Guess stay cheap (the wheel over it scrolls only the box, not the panel; the same for the chart's bars, through `keep_scroll` in `solver_panel.rs`). Clicking the heading folds the list away.
- **Suggestions:** the top 100, in a box eight rows tall that scrolls on its own (the panel stays put), each with its bits and the Candidates expected to be left (`Σ n²/N`). A dot in the Correct colour marks a word that could be the Answer, so guessing it might win now. Ties go to such a word, as described above. Before the first Guess, a Suggestion whose row is in the [Guess Count Matrix](guess-count-matrix.md) summary also shows its Average Guess Count under the panel's Strategy (three decimals, in the accent colour).
- **Chart:** click a Suggestion, or type any Guess List word into **Search a word to chart…**, to see its Feedback Split as horizontal bars. Each bar is one Feedback, drawn as its five Marks in the theme's colours, as long as the number of Candidates that would give it (the Win bar is in the Correct colour). The title gives the expected number of words left and the bits. Every group is drawn, biggest first, in a box that scrolls once it is taller than 320 px. **Type it** puts the word on the board.
- **Guess Distribution** (before the first Guess only): under the Feedback Split, the charted word's Average Guess Count (over every Answer, Losses at their real count, as `summary.json` has it), its Losses and its rank under the panel's Strategy, then one bar per Guess Count 1 to 6 and a last **Lost** bar, drawn like the Feedback Split's bars (won bars in the Correct colour, Lost in the error colour). It reads the entry of the Strategy the settings name, by its version 2 id. When there is nothing to show, a short note says why instead: no `summary.json` yet; a Strategy the summary doesn't cover yet (a version 1 summary, keyed by the old ids, covers none until it is migrated); a Guess List word under an Answer List Strategy, whose matrix has no row for it; an Opener whose row isn't finished; or an unreadable file. The first, second and fourth add a **Precompute guess counts…** button. After the first Guess none of this shows, not even the note, so it is never taken for a statement about the State.
- **Search field:** a click sends the keys there instead of the board. Enter, Escape or a click on the board sends them back. ⌘V (Ctrl+V) pastes letters into it.

The matrices are read from `precompute-cache/feedback/` (see [feedback-matrices.md](feedback-matrices.md)) the first time a set is used, on a background thread, and kept until the app closes. If they're missing or don't match the word lists, the panel says so and offers **Precompute matrices…**; when that finishes the panel reads them again. Ranking runs on a background thread, split across the cores: the full Guess List × All words search is 14,855 × 2,315 cells. The chart needs no matrix: it scores its word against the Candidates directly.

The Guess Count results come from `precompute-cache/guess-counts/summary.json`, whichever tool wrote it (see [Summary format](guess-count-matrix.md#summary-format)), not the matrices. It is read on a background thread each time the panel opens and again when a [Precompute guess counts](#precompute-guess-counts) run ends (finished, stopped or failed, since each rewrites the summary). `solver/opener_results.rs` has the logic, with no window: `read_summary` reads the file into a lookup by Strategy id and word (`Missing`, `Unreadable` or `Read`), and `lookup(summary, strategy, word, guesses made)` decides what shows: `Hidden` after the first Guess, `Found`, or one of the reasons above (`NoSummary`, `NotComputed`, `NotInPool`, `Unfinished`, `Unreadable`), each with its `note()`. `opener_results_tests.rs` checks them on a small summary file, and that the real `precompute-cache/` summary (if any) reads.

The chart is drawn with plain elements rather than gpui-kit's `BarChart`, so each bar's label can be the five coloured Marks and every colour comes from the app's theme.

## Solver mode

**Solver mode** (menu or palette; search `mode`) is for a Wordle played somewhere else, such as the real one in a browser. The window becomes two columns: on the left a board whose Feedback you click in by hand, on the right the [Solver](#solver), opened if it was closed. Since there is no Answer here, the app never works out a Feedback itself.

- Type the Guess you made there (real or on-screen keyboard) and press Enter. It must be on the Guess List; its tiles start Absent.
- Click a tile to move it on to its next Mark: Absent, Present, Correct, then Absent again. Every click works out the Candidates again and re-ranks the Suggestions.
- Backspace with nothing typed takes the last Guess back off the board to be edited.
- **Type it** in the solver's chart puts that word in as the Guess being typed.
- Up to six Guesses. A Guess clicked to all Correct is a Win: "Solved in N" shows and nothing more can be typed.
- **Start over** forgets every Guess; **Back to the game**, the command again, or any command that starts a Game (Play a new word, Try this word again, Play a seed…, Unlimited guesses) leaves it. Leaving keeps the solver open. **Reset layout** leaves it too.
- While it is on, the solver can't be closed, the keyboard and the sidebar's Guesses show the entered State, and the status bar says how many Guesses are entered instead of the Game's Seed and Guesses left.

The State and its keys are `solver/assist.rs` (`Assist`, tested in `assist_tests.rs` with no window); `ui/assist.rs` draws the board. The solver panel reads `shown_guesses()`, which is the entered State in Solver mode and the Game's otherwise.
