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
    theme.rs        the Rosé Pine palette and the colour of each Mark
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
- **New game** starts a random Game with the same Guess Limit; **Play unlimited** / **Play classic** switches the Guess Limit and starts a new Game.

## Theme

Colours come from [Rosé Pine](https://rosepinetheme.com/palette/ingredients) (the main variant), in `theme.rs`. It has no green, so a Correct tile is Pine, a Present tile is Gold, and an Absent tile is Overlay. On the keyboard an Absent key fades to Highlight Low, so the letters still in play stand out. Refusals and Losses show in Love, cheers in Foam.

## Title bar

Like Zed, the app draws its own title bar (`title_bar.rs`):

- **macOS:** the system title bar is transparent (`appears_transparent`) and the traffic lights are moved onto the app's bar. macOS still drags the window by the bar; a double-click does what the system setting says (zoom or minimise).
- **Windows:** the system title bar is hidden and the bar draws minimise, maximise and close with the Segoe Fluent Icons font, as Zed does. `window_control_area` tells Windows which parts drag the window and which are the caption buttons.
- **Linux:** gpui keeps the system title bar, so the app's bar shows under it.

The bar is Surface while the window is active and Base when it isn't.

## Building on macOS without Xcode

gpui normally compiles its Metal shaders at build time with Xcode's `metal` tool. The `runtime_shaders` feature compiles them when the app starts instead, so the Command Line Tools are enough. The feature does nothing on other platforms.
