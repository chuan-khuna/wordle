# Web backend

The FastAPI app behind the website, in `app/backend/`. It is its **own uv project**, not a member of the root workspace, but it **reuses the engine from `packages/wordle`** through a uv path dependency (`[tool.uv.sources] wordle = { path = "../../packages/wordle", editable = true }`): the word lists, Feedback, the Feedback matrices and the Solver's scoring all come from the package. The backend adds only the web layer. The website's plan is in `.scratch/website/spec.md`.

## Layout

```
app/backend/
  pyproject.toml          fastapi, uvicorn, numpy, python-dotenv and wordle (path source); pytest and httpx as dev tools
  wordle_backend/
    main.py               the FastAPI app (`wordle_backend.main:app`): lifespan, error handlers, routers
    routers/              one APIRouter per area, all under /api
      feedback.py         GET /api/feedback
      candidates.py       POST /api/candidates, POST /api/split
      suggestions.py      POST /api/suggestions
      solve.py            GET /api/solve
      benchmark.py        GET /api/benchmark, GET /api/openers
      guess_counts.py     GET /api/guess-counts
    common.py             shared by the routers: BadRequest and NotPrecomputed, request models, word and Feedback checks, JSON shapes
    solver.py             WebSolver (the package's Solver plus the Candidates-only switch)
  tests/
```

The root `pyproject.toml` only lists `packages/*` as members, so `app/backend/` has its own `.venv` and `uv.lock`, and the root workspace and its `uv.lock` are unaffected. Run `uv` commands from inside it (the `just` recipes do).

## What comes from the package

Feedback and Feedback Codes (`wordle.engine.feedback`, `wordle.solver.strategy.pack`), the word lists (`wordle.engine.words`), the Feedback matrices (`wordle.solver.matrix`) and `Solver` with `WordStats` (`wordle.solver.strategy`) are the package's; see [feedback-scoring.md](feedback-scoring.md), [feedback-matrices.md](feedback-matrices.md) and [solver-strategy.md](solver-strategy.md). The backend works with Candidates as Answer List indices and narrows them with `Solver.narrow`, one Turn after another; nothing is scored on the fly.

## The Solver wrapper

`solver.py` holds `WebSolver(Solver)`. The only behaviour it changes is `rank`: with one or two Candidates left it searches Candidates only, whatever `scope` says (guessing one is never worse). The package's `Solver.suggest` does this switch for a single Suggestion, but `rank` returns lists of Suggestions and the API uses it directly, so the backend wraps `rank` rather than forking the engine or changing the package. It adds two small helpers: `is_guess` and `is_answer`.

## Precomputed files

The backend reads the matrices from `precompute-cache/feedback/` at the repo root (gitignored, shared with the package and the gpui app), built with the package's `wordle.solver.matrix.build`: `answers_vs_answers.npy` and `guesses_vs_answers.npy`, rows Guesses and columns Answers in sorted order, each cell a Feedback Code as a `uint8` (see [feedback-matrices.md](feedback-matrices.md)).

The backend computes nothing ahead of time itself: every precompute command is the package's. `just precompute` writes the matrices, and `just precompute-benchmark` (`wordle.solver.cli.precompute_benchmark`) writes the [Benchmark](#benchmark-and-openers). It asks for the thread count (1, 2, 4 or 8) and before overwriting; `--threads N`, `--out DIR` (default `precompute-cache/benchmark/`) and `--yes` skip the questions. It builds the matrices first if they are missing. The eight Benchmarks take about 12 s with eight threads. The gpui desktop app writes the same two files, byte for byte, with **Precompute benchmark** (and at the end of a finished **Precompute guess counts…** run) in under a second; see [gpui-app.md](gpui-app.md#precompute-benchmark).

## Benchmark and openers

The package's `wordle.solver.benchmark` (`packages/wordle/src/wordle/solver/benchmark.py`) plays a Benchmark for each of the eight Strategies (`STRATEGIES` in `packages/wordle/src/wordle/solver/strategy.py`, in this order: Ranking, then Guess Pool, then Search Scope), every one from its own best Opener (`best_opener`: the first pick of that Strategy's Ranking over its whole Guess Pool, whatever its Search Scope, on the full Answer List), under the Guess Limit of six. The id is `<ranking>-<pool>-<scope>`, with the `global` Search Scope written `all`:

| `id` | Strategy (display name) | `pool`, `scope`, `by` | Opener |
| --- | --- | --- | --- |
| `bits-answers-candidates` | Expected Information, Answer List, Candidates only | `answers`, `candidates`, `bits` | raise |
| `bits-answers-all` | Expected Information, Answer List, All words | `answers`, `global`, `bits` | raise |
| `bits-guesses-candidates` | Expected Information, Guess List, Candidates only | `guesses`, `candidates`, `bits` | tarse |
| `bits-guesses-all` | Expected Information, Guess List, All words | `guesses`, `global`, `bits` | tarse |
| `expected-answers-candidates` | Expected Candidates, Answer List, Candidates only | `answers`, `candidates`, `expected` | raise |
| `expected-answers-all` | Expected Candidates, Answer List, All words | `answers`, `global`, `expected` | raise |
| `expected-guesses-candidates` | Expected Candidates, Guess List, Candidates only | `guesses`, `candidates`, `expected` | roate |
| `expected-guesses-all` | Expected Candidates, Guess List, All words | `guesses`, `global`, `expected` | roate |

Answers that have had the same Feedback so far share a Candidate Set and so the next Guess, so they are played together as a tree (`guess_counts` in `packages/wordle/src/wordle/solver/guess_counts.py`, described in [Solver Strategy](solver-strategy.md); `benchmark.py` calls it) with one search per node instead of one per Game; the Guess Counts are the same as playing each Game alone (`packages/wordle/tests/test_benchmark.py` checks this). A Game that needs more than six Guesses is a Loss and lands in `losses`, not in `distribution`; the Average Guess Count is over every Game, a Loss at the Guess Count it needed (as in the [Guess Count Matrix](guess-count-matrix.md), so the two agree for the same Opener).

Results on all 2,315 Answers (Guess Count 1 to 6, then Losses):

| Strategy | Opener | 1 | 2 | 3 | 4 | 5 | 6 | Losses | Average |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `bits-answers-candidates` | raise | 1 | 131 | 999 | 919 | 207 | 47 | 11 | 3.599 |
| `bits-answers-all` | raise | 1 | 61 | 1139 | 1020 | 92 | 2 | 0 | 3.495 |
| `bits-guesses-candidates` | tarse | 0 | 147 | 1021 | 941 | 166 | 34 | 6 | 3.542 |
| `bits-guesses-all` | tarse | 0 | 61 | 1256 | 943 | 53 | 2 | 0 | 3.429 |
| `expected-answers-candidates` | raise | 1 | 131 | 957 | 946 | 224 | 42 | 14 | 3.625 |
| `expected-answers-all` | raise | 1 | 61 | 1077 | 1086 | 90 | 0 | 0 | 3.520 |
| `expected-guesses-candidates` | roate | 0 | 126 | 1006 | 936 | 195 | 39 | 13 | 3.594 |
| `expected-guesses-all` | roate | 0 | 55 | 1136 | 1084 | 40 | 0 | 0 | 3.479 |

`bits-answers-candidates` agrees with the table in [solver-strategy.md](solver-strategy.md). The four Strategies the Benchmark had before (`bits-candidates`, `expected-candidates`, `bits-all`, `expected-all`) are now `*-answers-candidates` and `*-guesses-all`, with the same results.

The Opener leaderboard ranks every Guess List word as a first Guess by Expected Information (ties: Candidate first, then Expected Candidates, then alphabetical) and keeps the top 500. It stores the first-turn stats only, not a Benchmark per Opener.

`just precompute-benchmark` saves `benchmark.json` and `openers.json` in `precompute-cache/benchmark/`. `main.py` reads them at startup if present; a missing file is not a startup error. `/api/benchmark` serves `benchmark.json` as it is, so it lists whatever Strategies the file holds (eight once `just precompute-benchmark` has run).

`GET /api/guess-counts` serves the [Guess Count Matrix](guess-count-matrix.md) summary instead: `main.py` reads `precompute-cache/guess-counts/summary.json` once at startup (`guess_count_matrix.load_summary`) into `app.state.guess_counts`. It is optional too; `just precompute-guess-counts` or `just restore-cache` writes it.

## API

`main.py` loads the matrices once at startup with mmap (in FastAPI's lifespan) into a `WebSolver` kept on `app.state`. They are never built there: if missing, startup fails with a message pointing to `just precompute`. The Benchmark JSON files and the Guess Count Matrix `summary.json` are loaded too but are optional: if one is missing, only its endpoint fails. Run it with `just backend` (uvicorn, `http://127.0.0.1:8000`; extra arguments go to uvicorn, e.g. `--port 8001 --reload`).

Settings come from the environment or the project's `.env` at the root (`.env.example` lists them; `main.py` loads it with python-dotenv, and a variable set in the shell wins). The one setting is `CORS_ORIGINS`: comma-separated origins (or `*`) that may call the API from a browser, through `CORSMiddleware` for GET and POST. It is empty by default, so no CORS headers are sent: the website doesn't need them, since Next proxies `/api` and the browser only talks to Next. Set it only for a page on another origin that calls the backend directly.

Words are lowercase five-letter strings. A Feedback is written as **five digits, one per letter: 0 Absent, 1 Present, 2 Correct** (`"20102"`), the base-3 digits of its Feedback Code; the emoji squares are for display only. Every response with a Feedback gives both `marks` (that string) and `code` (the Feedback Code). A State is `[{guess, feedback}]` with `feedback` as the digit string. `pool`, `scope` and `by` are as in [solver-strategy.md](solver-strategy.md) (defaults `guesses`, `global`, `bits`). A "WordStats" below is `{word, bits, expected_candidates, groups, largest_group, is_candidate, win_chance}`.

| Endpoint | Request | Response |
| --- | --- | --- |
| `GET /api/feedback` | `guess`, `answer` (any Guess List words) | `{guess, answer, marks, code}` |
| `POST /api/candidates` | `{state}` | `{count, words}` |
| `POST /api/split` | `{guess, state}` | WordStats fields of the Guess, plus `candidates` and `split`: `[{marks, code, count, words}]`, biggest group first |
| `POST /api/suggestions` | `{state, pool, scope, by, top}` (`top` default 10) | `{candidates, suggestions: [WordStats]}`, best first |
| `GET /api/solve` | `answer` (Answer List word), `pool`, `scope`, `by`, optional `opener` | `{answer, solved, guesses, steps}`; the first Guess (the Opener) is ranked over the whole Guess Pool whatever `scope` says, as in the Benchmark, and `scope` applies from the second Guess on; with `opener` (a word of the Guess Pool, else 400 "opener ... is not on the Guess Pool") that word is Guess 1 instead and the later Guesses come from the Strategy as usual, while step 1's `alternatives` stay the Strategy's top Suggestions (so they may not include the Opener); without `opener` the response is exactly as before; each step is `{number, guess, marks, code, candidates_before, candidates_after, alternatives: [WordStats]}`, with the top 5 for that step (the first is the Guess played) |
| `GET /api/openers` | `top` (default 20) | `{total, openers}` with `total` the number saved (500); each opener is `{rank, word, bits, expected_candidates, groups, largest_group, is_candidate}`, best first |
| `GET /api/benchmark` | none | `{guess_limit, strategies}`; each Strategy is `{id, name, pool, scope, by, opener, games, distribution, losses, lost_answers, average_guess_count}`. `distribution` has six numbers, Games won in 1 to 6 Guesses; `lost_answers` lists the Losses; `average_guess_count` is over every Game, Losses at their real Guess Count |
| `GET /api/guess-counts` | `strategy` (one of the eight Strategy ids, default `bits-guesses-all`) | `{strategy: {id, name}, complete_rows, total_rows, openers}`; `total_rows` is the size of the Strategy's Guess Pool (14,855 for the Guess List, 2,315 for the Answer List), the rows of its Guess Count Matrix, and `complete_rows` how many Openers have a finished row in the Guess Count Matrix, which is how many `openers` there are. Each opener is `{rank, word, average_guess_count, losses, is_answer}`, in the summary's rank order (lowest unrounded Average Guess Count first, then Expected Information, then alphabetical). `average_guess_count` is over all 2,315 Answers with no Guess Limit, so it times 2,315 is a whole number. About 15k entries, so the response is gzipped (`GZipMiddleware` in `main.py`, for any response over 1 kB) |

Invalid input (an unknown word, a malformed Feedback, a bad `pool`/`scope`/`by`, a missing parameter, `top` below 1 or not a number, an empty Candidate Set for `/api/split`) returns HTTP 400 with `{"detail": "<message>"}`; the `RequestValidationError` handler in `main.py` replaces FastAPI's 422. `/api/solve` stops after 12 Guesses as a safety limit. If `benchmark.json` or `openers.json` is missing, `/api/benchmark` or `/api/openers` returns HTTP 503 with `{"detail": "... Run `just precompute-benchmark` first."}`; the rest of the API still works.  If `summary.json` is missing (or lacks the Strategy), `/api/guess-counts` returns 503 with a message naming `just precompute-guess-counts` (or `just restore-cache`); an unknown `strategy` (an old version 1 id such as `bits-all` included) is 400, with a message listing the eight ids. The real `summary.json` must be version 2 (its keys the new ids; `just migrate-guess-counts` moves a version 1 folder), or every Strategy is a 503.

`tests/test_api.py` uses FastAPI's `TestClient` (and checks the Candidates-only switch on `WebSolver` against the package's `Solver.rank`); `tests/conftest.py` builds the matrices once only if they are missing. `tests/test_benchmark.py` checks the two Benchmark endpoints (the JSON shape, the eight ids in order, the 400 and 503 cases) with the eight Benchmarks on 12 Answers swapped into the app, so it does not need the real JSON files. `tests/test_guess_counts.py` does the same for `/api/guess-counts` with a small fixture summary of three Strategies (shape, rank order, default Strategy, `complete_rows`/`total_rows` for a Guess List and an Answer List Strategy, every one of the eight ids accepted, 400 for an unknown or old id with the ids listed, both 503 cases, gzip). `tests/test_api.py` also checks that `/api/solve` opens with `tarse` under the Guess List and Candidates only. It also checks `opener` through the endpoint: it becomes Guess 1 and the Game still ends in a Win, step 1's alternatives are unchanged, an Opener equal to the Answer gives a one-Guess Game, an Opener off the Guess Pool (including a Guess List word under the Answer List pool) is 400, and the best Opener passed explicitly gives the same Game as none. The engine's own tests (Feedback, matrices, Strategy, the Benchmark) are in `packages/wordle/tests/`.

## Commands

| Command | What it does |
| --- | --- |
| `just precompute` | Write the Feedback matrices (the package's command; the backend will not start without them) |
| `just precompute-benchmark` | Write the Benchmark and the Opener leaderboard to `precompute-cache/benchmark/` (the package's command). Takes `--threads N`, `--out DIR`, `--yes` |
| `just backend` | Serve the API with uvicorn from `app/backend/`. Takes uvicorn options, e.g. `--port 8001` |
| `just test-backend` | Run the backend's tests (`uv run pytest` in `app/backend/`) |

