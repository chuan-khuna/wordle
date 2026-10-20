# Web backend

The FastAPI app behind the website, in `app/backend/`. It is its **own uv project**, not a member of the root workspace, but it **reuses the engine from `packages/wordle`** through a uv path dependency (`[tool.uv.sources] wordle = { path = "../../packages/wordle", editable = true }`): the word lists, Feedback, the Feedback matrices and the Solver's scoring all come from the package. The backend adds only the web layer. The website's plan is in `.scratch/website/spec.md`.

## Layout

```
app/backend/
  pyproject.toml          fastapi, uvicorn, numpy and wordle (path source); pytest and httpx as dev tools
  wordle_backend/
    main.py               the FastAPI app (`wordle_backend.main:app`): lifespan, error handlers, routers
    routers/              one APIRouter per area, all under /api
      feedback.py         GET /api/feedback
      candidates.py       POST /api/candidates, POST /api/split
      suggestions.py      POST /api/suggestions
      solve.py            GET /api/solve
      benchmark.py        GET /api/benchmark, GET /api/openers
    common.py             shared by the routers: BadRequest and NotPrecomputed, request models, word and Feedback checks, JSON shapes
    solver.py             WebSolver (the package's Solver plus the Candidates-only switch)
    benchmark.py          the Benchmark and the Opener leaderboard (play, save, load JSON)
    precompute.py         the command behind `just backend-precompute`
  tests/
```

The root `pyproject.toml` only lists `packages/*` as members, so `app/backend/` has its own `.venv` and `uv.lock`, and the root workspace and its `uv.lock` are unaffected. Run `uv` commands from inside it (the `just` recipes do).

## What comes from the package

Feedback and Feedback Codes (`wordle.engine.feedback`, `wordle.solver.strategy.pack`), the word lists (`wordle.engine.words`), the Feedback matrices (`wordle.solver.matrix`) and `Solver` with `WordStats` (`wordle.solver.strategy`) are the package's; see [feedback-scoring.md](feedback-scoring.md), [feedback-matrices.md](feedback-matrices.md) and [solver-strategy.md](solver-strategy.md). The backend works with Candidates as Answer List indices and narrows them with `Solver.narrow`, one Turn after another; nothing is scored on the fly.

## The Solver wrapper

`solver.py` holds `WebSolver(Solver)`. The only behaviour it changes is `rank`: with one or two Candidates left it searches Candidates only, whatever `scope` says (guessing one is never worse). The package's `Solver.suggest` does this switch for a single Suggestion, but `rank` returns lists of Suggestions and the API and the Benchmark use it directly, so the backend wraps `rank` rather than forking the engine or changing the package. It adds two small helpers: `is_guess` and `is_answer`.

## Feedback matrices and precompute

The backend reads the matrices from `precompute-cache/feedback/` at the repo root (gitignored, shared with the package; the gpui app keeps its own byte-identical copy in `precompute-cache/feedback-rust/`), built with the package's `wordle.solver.matrix.build`: `answers_vs_answers.npy` and `guesses_vs_answers.npy`, rows Guesses and columns Answers in sorted order, each cell a Feedback Code as a `uint8` (see [feedback-matrices.md](feedback-matrices.md)).

`just backend-precompute` runs `wordle_backend.precompute`, which takes `--threads N` (default 1), `--out DIR` (the cache directory, default `precompute-cache/`, with `feedback/` and `benchmark/` inside) and `--yes` (otherwise it asks before overwriting), and writes the matrices first and then the [Benchmark](#benchmark-and-openers). `--skip-benchmark` writes only the matrices; `--benchmark-only` reuses the existing matrices and writes only the Benchmark files. The matrices take about 4 s with one thread and about 1 s with four; the Benchmark about 11 s with three or four threads. Unlike `just precompute` it never asks for the thread count.

## Benchmark and openers

`benchmark.py` plays a Benchmark for each of the four named Strategies (`STRATEGIES` in `packages/wordle/src/wordle/solver/strategy.py`, in this order), every one from its own best Opener (the first pick of that Strategy on the full Answer List), under the Guess Limit of six:

| `id` | Strategy (`pool`, `scope`, `by`) | Opener |
| --- | --- | --- |
| `bits-candidates` | Expected Information, Candidates only (`answers`, `candidates`, `bits`) | raise |
| `expected-candidates` | Expected Candidates, Candidates only (`answers`, `candidates`, `expected`) | raise |
| `bits-all` | Expected Information over All words (`guesses`, `global`, `bits`) | tarse |
| `expected-all` | Expected Candidates over All words (`guesses`, `global`, `expected`) | roate |

Answers that have had the same Feedback so far share a Candidate Set and so the next Guess, so they are played together as a tree (`guess_counts` in `packages/wordle/src/wordle/solver/guess_counts.py`, described in [Solver Strategy](solver-strategy.md); `benchmark.py` calls it) with one search per node instead of one per Game; the Guess Counts are the same as playing each Game alone (tests in the package and here check this). A Game that needs more than six Guesses is a Loss and lands in `losses`, not in `distribution`; the Average Guess Count is over the won Games only.

Results on all 2,315 Answers (Guess Count 1 to 6, then Losses):

| Strategy | Opener | 1 | 2 | 3 | 4 | 5 | 6 | Losses | Average |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `bits-candidates` | raise | 1 | 131 | 999 | 919 | 207 | 47 | 11 | 3.582 |
| `expected-candidates` | raise | 1 | 131 | 957 | 946 | 224 | 42 | 14 | 3.603 |
| `bits-all` | tarse | 0 | 61 | 1256 | 943 | 53 | 2 | 0 | 3.429 |
| `expected-all` | roate | 0 | 55 | 1136 | 1084 | 40 | 0 | 0 | 3.479 |

`bits-candidates` agrees with the table in [solver-strategy.md](solver-strategy.md) (its average there, 3.60, counts the 11 Losses at 7 or 8 Guesses). The Python package has no Benchmark of its own.

The Opener leaderboard ranks every Guess List word as a first Guess by Expected Information (ties: Candidate first, then Expected Candidates, then alphabetical) and keeps the top 500. It stores the first-turn stats only, not a Benchmark per Opener.

`precompute` saves `benchmark.json` and `openers.json` in `precompute-cache/benchmark/`. `main.py` reads them at startup if present; a missing file is not a startup error.

## API

`main.py` loads the matrices once at startup with mmap (in FastAPI's lifespan) into a `WebSolver` kept on `app.state`. They are never built there: if missing, startup fails with a message pointing to `just backend-precompute`. The Benchmark JSON files are loaded too but are optional: if one is missing, only its endpoint fails. Run it with `just backend` (uvicorn, `http://127.0.0.1:8000`; extra arguments go to uvicorn, e.g. `--port 8001 --reload`).

Words are lowercase five-letter strings. A Feedback is written as **five digits, one per letter: 0 Absent, 1 Present, 2 Correct** (`"20102"`), the base-3 digits of its Feedback Code; the emoji squares are for display only. Every response with a Feedback gives both `marks` (that string) and `code` (the Feedback Code). A State is `[{guess, feedback}]` with `feedback` as the digit string. `pool`, `scope` and `by` are as in [solver-strategy.md](solver-strategy.md) (defaults `guesses`, `global`, `bits`). A "WordStats" below is `{word, bits, expected_candidates, groups, largest_group, is_candidate, win_chance}`.

| Endpoint | Request | Response |
| --- | --- | --- |
| `GET /api/feedback` | `guess`, `answer` (any Guess List words) | `{guess, answer, marks, code}` |
| `POST /api/candidates` | `{state}` | `{count, words}` |
| `POST /api/split` | `{guess, state}` | WordStats fields of the Guess, plus `candidates` and `split`: `[{marks, code, count, words}]`, biggest group first |
| `POST /api/suggestions` | `{state, pool, scope, by, top}` (`top` default 10) | `{candidates, suggestions: [WordStats]}`, best first |
| `GET /api/solve` | `answer` (Answer List word), `pool`, `scope`, `by` | `{answer, solved, guesses, steps}`; each step is `{number, guess, marks, code, candidates_before, candidates_after, alternatives: [WordStats]}`, with the top 5 for that step (the first is the Guess played) |
| `GET /api/openers` | `top` (default 20) | `{total, openers}` with `total` the number saved (500); each opener is `{rank, word, bits, expected_candidates, groups, largest_group, is_candidate}`, best first |
| `GET /api/benchmark` | none | `{guess_limit, strategies}`; each Strategy is `{id, name, pool, scope, by, opener, games, distribution, losses, lost_answers, average_guess_count}`. `distribution` has six numbers, Games won in 1 to 6 Guesses; `lost_answers` lists the Losses; `average_guess_count` is over won Games (`null` if none) |

Invalid input (an unknown word, a malformed Feedback, a bad `pool`/`scope`/`by`, a missing parameter, `top` below 1 or not a number, an empty Candidate Set for `/api/split`) returns HTTP 400 with `{"detail": "<message>"}`; the `RequestValidationError` handler in `main.py` replaces FastAPI's 422. `/api/solve` stops after 12 Guesses as a safety limit. If `benchmark.json` or `openers.json` is missing, `/api/benchmark` or `/api/openers` returns HTTP 503 with `{"detail": "... Run `just backend-precompute` first."}`; the rest of the API still works.

`tests/test_api.py` uses FastAPI's `TestClient` (and checks the Candidates-only switch on `WebSolver` against the package's `Solver.rank`); `tests/conftest.py` builds the matrices once only if they are missing. `tests/test_benchmark.py` runs the Benchmark on 12 Answers (tree play against one-Game-at-a-time play, the JSON shape, the 400 and 503 cases) and swaps its own results into the app, so it does not need the real JSON files. `tests/test_precompute.py` runs the command into a temporary directory. The engine's own tests (Feedback, matrices, Strategy) are in `packages/wordle/tests/`.

## Commands

| Command | What it does |
| --- | --- |
| `just backend-precompute` | Write the Feedback matrices, the Benchmark and the Opener leaderboard to `precompute-cache/`. Takes `--threads N`, `--out DIR`, `--yes`, `--skip-benchmark`, `--benchmark-only` |
| `just backend` | Serve the API with uvicorn from `app/backend/`. Takes uvicorn options, e.g. `--port 8001` |
| `just test-backend` | Run the backend's tests (`uv run pytest` in `app/backend/`) |

