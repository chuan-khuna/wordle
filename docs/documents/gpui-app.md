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

The `justfile` recipes use `[working-directory: 'app/wordle-gpui']`, and set `windows-shell` to PowerShell, so they work on Windows too.

## Layout

```
app/wordle-gpui/
  Cargo.toml        gpui 0.2.2 with the `runtime_shaders` feature
  data/             answers.txt, guesses.txt, SOURCES.md (copied from packages/wordle)
  src/
    lib.rs          the rules, with no window: usable from tests
    feedback.rs     Mark, Feedback and the two-pass scoring rule
    words.rs        the word lists, built into the binary with include_str!
    seed.rs         Python-compatible Mersenne Twister, so Seeds match the terminal game
    game.rs         Game, Guess, Error, share_grid
    main.rs         the window: board, on-screen keyboard, buttons, command-line options
    theme.rs        the themes (Rosé Pine, Catppuccin) and the theme search
    theme_picker.rs the theme picker's state and keys, testable without a window
    title_bar.rs    the Zed-style title bar
```

`feedback.rs` and `game.rs` follow [feedback-scoring.md](feedback-scoring.md) and [game-and-state.md](game-and-state.md). Their tests check against values printed by the Python game.

## Seeds match the Python game

`Game.random(seed)` in Python picks `random.Random(seed).choice(answers)`. `seed.rs` reproduces that exactly: MT19937 seeded with `init_by_array([seed])`, then `_randbelow(n)` (draw `n.bit_length()` bits, reject draws `>= n`). This holds only while both games use the same sorted Answer List, so keep `app/wordle-gpui/data/` and `packages/wordle/src/wordle/data/` identical.

## The window

- Type letters, Backspace and Enter on the real keyboard, or click the on-screen keys. Cmd-Q (Ctrl-Q elsewhere) quits, and so does closing the window.
- A refused Guess shows its reason under the board and doesn't use up a Guess.
- The keyboard colours each letter by the best Mark seen for it (Correct beats Present beats Absent).
- The title bar reads `wordle / classic / seed 7`: the Guess Limit, then the Seed (or `chosen answer`). Under the heading, the status line shows Guesses left (or the Guess count when unlimited).
- After a Win or Loss: a cheer or the Answer, the `just wordle-gpui ...` command that replays the Game, and a **Copy share grid** button.

## Settings menu

The hamburger at the right of the title bar opens a menu:

- **Reset game:** a new random Answer, keeping the Guess Limit.
- **Restart game:** the same Game from the start (`Game::restart()`): the same Answer, Seed and Guess Limit, with no Guesses. Works for a chosen Answer (`--answer`) too.
- **Play a seed…:** turns into a seed field. Type up to six digits (any number from 0 to 999,999), Enter plays that Seed with the current Guess Limit, Escape goes back to the menu. It picks the same Answer as `just wordle --seed N`.
- **Change theme…:** opens the theme picker (below). The hint shows the current theme.
- **Unlimited guesses:** ticked when the Game has no Guess Limit. Choosing it switches between six Guesses and unlimited and starts a new Game, since changing the limit mid-Game would change whether it can be lost.

While the menu is open, typing doesn't reach the board. Escape or a click anywhere else closes the menu. The menu is drawn with gpui's `deferred(anchored(...))` so it sits above the rest of the window, with a transparent backdrop underneath it that catches the click outside. Both the hamburger and the menu `occlude()`, so on Windows a click on them isn't taken as dragging the title bar.

## Theme

Four themes, defined in `theme.rs`. The app starts in Rosé Pine.

| Theme | Appearance | Correct | Present | Absent |
| --- | --- | --- | --- | --- |
| [Rosé Pine](https://rosepinetheme.com/palette/ingredients) | Dark | Pine | Gold | Overlay |
| Rosé Pine Dawn | Light | Pine | Gold | Muted |
| [Catppuccin](https://catppuccin.com/palette) Mocha | Dark | Green | Yellow | Surface 0 |
| Catppuccin Latte | Light | Green | Yellow | Overlay 1 |

Each theme is a `Theme` value that maps its palette onto the same roles (`background`, `surface`, `overlay`, `text`, `correct`, `present`, `absent`, `heading`, `error`, `success`, `accent`, …). The UI only uses the roles, so adding a theme means adding one `Theme` and listing it in `THEMES`. In dark themes an Absent key fades into the background, so the letters still in play stand out; in light themes it matches the Absent tile. Messages under the board store a tone (error, success, info) rather than a colour, so they change colour with the theme.

The chosen theme lasts until the app closes; it isn't saved.

### Theme picker

Open it with **Change theme…** in the settings menu, or with Zed's shortcut, ⌘K ⌘T (Ctrl+K Ctrl+T on Windows and Linux).

- Type to filter by name. The letters must appear in order but not side by side (`cmo` finds Catppuccin Mocha). Case and accents don't matter (`rose` finds Rosé Pine), and `dark` or `light` filters by appearance.
- Up and Down move through the matches, and each move previews that theme on the whole window. Typing previews the first match.
- Enter or a click keeps the theme. Escape, a click outside, or the shortcut again puts back the theme from before the picker opened.

## Title bar

Like Zed, the app draws its own title bar (`title_bar.rs`):

- **macOS:** the system title bar is transparent (`appears_transparent`) and the traffic lights are moved onto the app's bar. macOS still drags the window by the bar; a double-click does what the system setting says (zoom or minimise).
- **Windows:** the system title bar is hidden and the bar draws minimise, maximise and close with the Segoe Fluent Icons font, as Zed does. `window_control_area` tells Windows which parts drag the window and which are the caption buttons.
- **Linux:** gpui keeps the system title bar, so the app's bar shows under it.

The bar is the theme's `surface` while the window is active and its `background` when it isn't.

## Building on macOS without Xcode

gpui normally compiles its Metal shaders at build time with Xcode's `metal` tool. The `runtime_shaders` feature compiles them when the app starts instead, so the Command Line Tools are enough. The feature does nothing on other platforms.
