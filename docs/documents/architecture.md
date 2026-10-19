# Architecture

How the repo is laid out and how the pieces fit together.

## Workspace

The repo is a [uv workspace](https://docs.astral.sh/uv/concepts/projects/workspaces/). The root `pyproject.toml` is a small project (`wordle-workspace`) that:

- lists every package under `packages/*` as a workspace member,
- depends on the `wordle` package from the workspace, so `uv run` at the root can use it,
- holds the shared dev tools (`pytest`) and test settings.

```
pyproject.toml              workspace root
src/main.py                 entry point: `uv run src/main.py`
packages/
  wordle/                   the game package (installable, has the `wordle` command)
    pyproject.toml
    src/wordle/
      feedback.py           Mark, Feedback and the scoring rule
      words.py              loads the Answer List and Guess List
      game.py               Game, Guess, State
      cli.py                the terminal game (questionary + rich)
      __main__.py           `python -m wordle`
      data/                 answers.txt, guesses.txt, SOURCES.md
    tests/
```

A future Solver can be added as another member, e.g. `packages/wordle-solver`, depending on `wordle`.

## Layers inside `wordle`

Each module only uses the ones above it:

1. **`feedback.py`**: pure function from a Guess and an Answer to Feedback. No game rules, no I/O. See [feedback-scoring.md](feedback-scoring.md).
2. **`words.py`**: reads the word lists bundled in `data/` once (`load_word_lists()` is cached).
3. **`game.py`**: the rules of a Game: six Guesses, which words are allowed, Win and Loss. See [game-and-state.md](game-and-state.md).
4. **`cli.py`**: everything on screen and every prompt. See [terminal-ui.md](terminal-ui.md).

Keeping the screen code out of `game.py` means the Solver and Benchmark can play Games with no terminal at all.

## Ways to run it

| Command | What it does |
| --- | --- |
| `uv run src/main.py` | Start the game (menu) |
| `uv run wordle` | Same, via the package's console script |
| `uv run python -m wordle` | Same, via `__main__.py` |
| `uv run pytest` | Run the tests of every package |
| `uv build --package wordle` | Build a wheel; it includes the word lists |

All three game commands take `--answer WORD` or `--seed N` to skip the menu.

## Dependencies

| Package | Used for |
| --- | --- |
| `questionary` | Menus and text prompts with live validation |
| `rich` | Drawing the board, keyboard and panel in colour |
| `pytest` (dev) | Tests |

`feedback.py`, `words.py` and `game.py` use only the standard library.
