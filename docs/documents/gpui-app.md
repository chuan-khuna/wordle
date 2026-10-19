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

```
app/wordle-gpui/
  Cargo.toml          gpui-pre (gpui, as gpui-kit builds on it), gpui-base (the Button), ureq and scraper for the dictionary
  data/               answers.txt, guesses.txt, SOURCES.md (copied from packages/wordle)
  src/
    lib.rs            the library: `pub mod rules`, usable from tests with no window
    rules/
      feedback.rs     Mark, Feedback and the two-pass scoring rule
      words.rs        the word lists, built into the binary with include_str!
      seed.rs         Python-compatible Mersenne Twister, so Seeds match the terminal game
      game.rs         Game, Guess, Error, share_grid, random_seed
      hints.rs        best_marks (the keyboard's colours) and live_hint
    main.rs           parse the options, bind the keys, open the window
    args.rs           --answer, --seed, --unlimited
    commands.rs       Command (shared by the menu and the palette), the palette's and seed field's state
    dictionary.rs     the Oxford Learner's Dictionary lookup (blocking; run in the background)
    search.rs         the loose matching behind the palette and the theme picker
    theme/
      mod.rs          the Theme roles, THEMES and the theme search
      rose_pine.rs, rose_pine_dawn.rs, catppuccin_mocha.rs, catppuccin_latte.rs
                      one theme each
      picker.rs       the theme picker's state and keys
    ui/
      mod.rs          WordleApp: the state, the overlays, key routing, Render
      title_bar.rs    the Zed-style title bar
      status_bar.rs   the bar along the bottom
      sidebar.rs      Guesses and their meanings
      board.rs        the tiles and the on-screen keyboard
      menu.rs         the hamburger and the settings menu, and the command rows both lists draw
      palette.rs      the command palette
      theme_picker.rs the theme picker
      widgets.rs      panel, query field, menu row, button (gpui-base `Button`, themed)
```

Everything with state and keys but no drawing (`commands.rs`, `theme/picker.rs`, `rules/`, the dictionary's parsing) has unit tests. The `ui/` modules each add `impl WordleApp` blocks that draw one part of the window.

`feedback.rs` and `game.rs` follow [feedback-scoring.md](feedback-scoring.md) and [game-and-state.md](game-and-state.md). Their tests check against values printed by the Python game.

## Seeds match the Python game

`Game.random(seed)` in Python picks `random.Random(seed).choice(answers)`. `seed.rs` reproduces that exactly: MT19937 seeded with `init_by_array([seed])`, then `_randbelow(n)` (draw `n.bit_length()` bits, reject draws `>= n`). This holds only while both games use the same sorted Answer List, so keep `app/wordle-gpui/data/` and `packages/wordle/src/wordle/data/` identical.

## The window

- Type letters, Backspace and Enter on the real keyboard, or click the on-screen keys. Cmd-Q (Ctrl-Q elsewhere) quits, and so does closing the window.
- A refused Guess shows its reason under the board and doesn't use up a Guess.
- The keyboard colours each letter by the best Mark seen for it (Correct beats Present beats Absent).
- The title bar holds only the hamburger (and the window buttons).
- The status bar along the bottom has the sidebar button on the left, and on the right the Guess Limit (`classic` or `unlimited`), the Seed (or `chosen answer`) with a button that copies it, and the Guesses left (or the Guess count when unlimited).
- After a Win or Loss: a cheer, or "Out of guesses" with a **Show the answer** button (the Answer stays hidden until clicked, here and in the sidebar); the `just wordle-gpui ...` command that replays the Game, which copies itself when clicked; and three buttons: **Copy results** (the share grid), **Try this word again** (the same Answer, as the menu's row) and **Play a new word** (a new random Answer, as the menu's row).
- Copying (the seed, the results, the replay command) shows a toast that hides itself after 2 seconds.

## Settings menu

The hamburger at the right of the title bar opens a menu. Its rows are the `Command`s in `commands.rs`, so the menu and the command palette always offer the same things:

- **Play a new word:** a new random Answer, keeping the Guess Limit.
- **Try this word again:** the same Game from the start (`Game::restart()`): the same Answer, Seed and Guess Limit, with no Guesses. Works for a chosen Answer (`--answer`) too.
- **Play a seed…:** turns into a seed field. Type or paste (⌘V, Ctrl+V) up to six digits (any number from 0 to 999,999; pasting keeps only the digits), Enter plays that Seed with the current Guess Limit, Escape goes back to the menu. A **Paste seed** button beside it does the same as the paste shortcut. It picks the same Answer as `just wordle --seed N`.
- **Copy seed:** copies the Seed's number to the clipboard. A Game with a chosen Answer has no Seed, so it says so instead.
- **Unlimited guesses:** ticked when the Game has no Guess Limit. Choosing it switches between six Guesses and unlimited and starts a new Game, since changing the limit mid-Game would change whether it can be lost.
- **Live hints:** ticked when on (see below).
- **Show sidebar:** ticked when the sidebar is open (see below).
- **Change theme…:** opens the theme picker (below). The hint shows the current theme.

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

With **Live hints** on, the tiles of the Guess being typed show what earlier Guesses already say about each letter, before it is submitted (`rules/hints.rs`):

| Earlier Guesses say | Typed tile |
| --- | --- |
| Correct in this spot | border in the Correct colour |
| In the Answer, but not known to be in this spot | border in the Present colour |
| Absent | faint border, faded letter |
| Nothing (not guessed yet) | the usual border |

Hints use the border, not a fill, so a typed row never looks like a submitted one. They are off by default.

## Sidebar

The button at the left of the status bar, **Show sidebar**, or ⌘B (Ctrl+B) opens a sidebar on the left. The window widens by the sidebar's width (unless it is maximised), so the board keeps its size.

- **Guesses:** each Guess as a row of small tiles, and the Answer after a Loss. Click one to see its meaning.
- **Meaning:** the picked word in the [Oxford Learner's Dictionaries](https://www.oxfordlearnersdictionaries.com): each part of speech with its pronunciations, then numbered senses with their CEFR level, labels and first example. A word that isn't there shows the site's spelling suggestions.

Nothing is looked up until you click a word, so playing never touches the network. `dictionary.rs` is a Rust port of the Oxford source in the `dictionary-tui` project: it fetches the search page with a browser User-Agent, follows the redirect to the entry, scrapes it with `scraper`, and fetches the other parts of speech listed under "related entries". The lookup blocks, so it runs on gpui's background executor; results (and failures) are kept for the session, and clicking a word whose lookup failed tries again. `cargo test -- --ignored` runs one test against the real site.

## Theme

Four themes, one file each in `theme/` (`rose_pine.rs`, …). The app starts in Rosé Pine.

| Theme | Appearance | Correct | Present | Absent |
| --- | --- | --- | --- | --- |
| [Rosé Pine](https://rosepinetheme.com/palette/ingredients) | Dark | Pine | Gold | Overlay |
| Rosé Pine Dawn | Light | Pine | Gold | Muted |
| [Catppuccin](https://catppuccin.com/palette) Mocha | Dark | Green | Yellow | Surface 0 |
| Catppuccin Latte | Light | Green | Yellow | Overlay 1 |

Each theme is a `Theme` value that maps its palette onto the same roles (`background`, `surface`, `overlay`, `text`, `correct`, `present`, `absent`, `heading`, `error`, `success`, `accent`, …). The UI only uses the roles, so adding a theme means adding a file with one `Theme`, declaring it in `theme/mod.rs` and listing it in `THEMES`. In dark themes an Absent key fades into the background, so the letters still in play stand out; in light themes it matches the Absent tile. Messages under the board store a tone (error, success, info) rather than a colour, so they change colour with the theme.

The chosen theme lasts until the app closes; it isn't saved.

### Theme picker

Open it with **Change theme…** in the settings menu, or with Zed's shortcut, ⌘K ⌘T (Ctrl+K Ctrl+T on Windows and Linux).

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
