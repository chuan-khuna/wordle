# Architecture

How the repo is laid out and how the pieces fit together.

## Workspace

The repo is a [uv workspace](https://docs.astral.sh/uv/concepts/projects/workspaces/). The root `pyproject.toml` is a small project (`wordle-workspace`) that:

- lists every package under `packages/*` as a workspace member,
- depends on the `wordle` package from the workspace, so `uv run` at the root can use it,
- holds the shared dev tools (`pytest`) and test settings.

```
pyproject.toml              workspace root
justfile                    `just wordle`, `just precompute`, `just precompute-guess-counts`, `just wordle-gpui`, `just test`, `just test-gpui`, `just test-backend`, `just backend`, `just backend-precompute`, `just frontend`, `just web`
src/main.py                 entry point: `uv run src/main.py`
src/precompute.py           entry point: `uv run src/precompute.py` (precompute the Feedback matrices)
src/precompute_guess_counts.py  entry point: `uv run src/precompute_guess_counts.py` (precompute the Guess Count Matrices)
precompute-cache/           gitignored: every precomputed file, shared by all three apps (feedback/ matrices, guess-counts/ matrices and summary, benchmark/ JSON)
app/
  wordle-gpui/              the desktop app in Rust + gpui (see gpui-app.md)
  backend/                  the website's FastAPI app: its own uv project outside the workspace, depending on `packages/wordle` through a path dependency (see web-backend.md)
  frontend/                 the website's Next.js app (App Router, TypeScript, Tailwind, bun), proxying /api to the backend (see web-frontend.md)
packages/
  wordle/                   the game package (installable, has the `wordle` command)
    pyproject.toml
    src/wordle/
      engine/               the game logic, with no screen code:
        feedback.py         Mark, Feedback and the scoring rule
        words.py            loads the Answer List and Guess List
        game.py             Game, Guess, State
      cli.py                the terminal game (questionary + rich)
      solver/               matrix.py (Feedback matrices), guess_count_matrix.py (Guess Count Matrix), strategy.py (the Solver), cli.py (the questions asked by `just precompute`)
      __main__.py           `python -m wordle`
      data/                 answers.txt, guesses.txt, SOURCES.md
    tests/
```

The Solver lives in `wordle/solver/`, above `engine/`; it adds `numpy` as a dependency. See [feedback-matrices.md](feedback-matrices.md).

## Layers inside `wordle`

Each module only uses the ones above it:

1. **`engine/feedback.py`**: pure function from a Guess and an Answer to Feedback. No game rules, no I/O. See [feedback-scoring.md](feedback-scoring.md).
2. **`engine/words.py`**: reads the word lists bundled in `data/` once (`load_word_lists()` is cached).
3. **`engine/game.py`**: the rules of a Game: six Guesses, which words are allowed, Win and Loss. See [game-and-state.md](game-and-state.md).
4. **`cli.py`**: everything on screen and every prompt. See [terminal-ui.md](terminal-ui.md).

Keeping the screen code out of `engine/` means the Solver and Benchmark can play Games with no terminal at all.

## Ways to run it

| Command | What it does |
| --- | --- |
| `just wordle` | Start the terminal game (runs `uv run src/main.py`) |
| `just wordle-gpui` | Start the desktop app. See [gpui-app.md](gpui-app.md) |
| `uv run src/main.py` | Start the game (menu) |
| `uv run wordle` | Same, via the package's console script |
| `uv run python -m wordle` | Same, via `__main__.py` |
| `uv run pytest` | Run the tests of every package |
| `just precompute-guess-counts` | Precompute the Guess Count Matrix of each Strategy and its summary. See [guess-count-matrix.md](guess-count-matrix.md) |
| `just backend-precompute` | Precompute the website backend's Feedback matrices, Benchmark and Opener leaderboard. See [web-backend.md](web-backend.md) |
| `just backend` | Serve the website backend with uvicorn. See [web-backend.md](web-backend.md) |
| `just frontend` | Serve the website frontend (Next.js dev server). See [web-frontend.md](web-frontend.md) |
| `just web` | Serve the backend and the frontend together. See [web-frontend.md](web-frontend.md) |
| `just test-backend` | Run the website backend's tests. See [web-backend.md](web-backend.md) |
| `uv build --package wordle` | Build a wheel; it includes the word lists |

All three game commands take `--answer WORD` or `--seed N` to skip the menu, and `--unlimited` for no Guess Limit.

## Dependencies

| Package | Used for |
| --- | --- |
| `questionary` | Menus and text prompts with live validation |
| `numpy` | Scoring every Guess against every Answer for the Feedback matrices |
| `rich` | Drawing the board, keyboard and panel in colour |
| `tqdm` | The progress bars of `just precompute-guess-counts` |
| `termcolor` | The yellow "Openers" label of that command's overall bar |
| `pytest` (dev) | Tests |

`engine/` uses only the standard library.
