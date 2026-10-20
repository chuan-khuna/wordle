# Web backend

The FastAPI app behind the website, in `app/backend/`. It is a **standalone uv project**: not a member of the root workspace, and it never imports `packages/wordle`. Like `app/wordle-gpui`, it keeps its own copy of the word lists and its own implementation of Feedback and Candidates. The website's plan is in `.scratch/website/spec.md`.

## Layout

```
app/backend/
  pyproject.toml          fastapi, uvicorn, numpy; pytest and httpx as dev tools
  wordle_backend/
    words.py              loads the Answer List and Guess List from data/
    feedback.py           the two-pass Feedback rule and Feedback Codes
    candidates.py         the Candidate Set for a State
    matrices.py           the vectorised Feedback matrices (build, load)
    strategy.py           ranking Guesses by Expected Information and Expected Candidates
    benchmark.py          the Benchmark and the Opener leaderboard (play, save, load JSON)
    api.py                the FastAPI app (`wordle_backend.api:app`)
    precompute.py         the command behind `just backend-precompute`
    data/                 answers.txt, guesses.txt, SOURCES.md (copies of packages/wordle/src/wordle/data/)
  matrices/               generated .npy and .json files (gitignored)
  tests/
```

The root `pyproject.toml` only lists `packages/*` as members, so `app/backend/` has its own `.venv` and `uv.lock`. Run `uv` commands from inside it (the `just` recipes do).

## Feedback and Feedback Codes

`feedback(guess, answer)` is the rule in [feedback-scoring.md](feedback-scoring.md). Here the Marks are plain ints (Absent 0, Present 1, Correct 2), so a Feedback is a tuple of five ints. `pack` reads them as base-3 digits into a Feedback Code (0 to 242, 242 is a Win), the same encoding as the [Feedback matrices](feedback-matrices.md); `unpack` is its inverse.

## Candidates

A State is a tuple of `Turn(guess, feedback)`, where `feedback` is a Feedback Code. `candidates(state)` keeps each Answer whose Feedback for the Guess equals the Turn's code, one Turn after another; an empty State gives the whole Answer List. It scores on the fly, with no matrices, which is fast enough for a handful of Turns.

## Feedback matrices

`matrices.py` scores every Guess against every Answer with the same vectorised two-pass rule as the Python package, in blocks of 256 Guesses, optionally on several threads (numpy releases the GIL, and each block writes its own rows). It writes `answers_vs_answers.npy` and `guesses_vs_answers.npy` into `app/backend/matrices/` (gitignored): rows are Guesses and columns are Answers in sorted order, each cell a Feedback Code as a `uint8`. The files are byte-identical to the ones `packages/wordle` and the gpui app write; see [feedback-matrices.md](feedback-matrices.md) for the encoding and format. `load()` memory-maps them, building them first if missing.

`just backend-precompute` runs `wordle_backend.precompute`, which takes `--threads N` (default 1), `--out DIR` and `--yes` (otherwise it asks before overwriting), and writes the matrices first and then the [Benchmark](#benchmark-and-openers). `--skip-benchmark` writes only the matrices; `--benchmark-only` reuses the existing matrices and writes only the Benchmark files. The matrices take about 4 s with one thread and about 1 s with four; the Benchmark about 11 s with three or four threads. Unlike the Python command it never asks for the thread count.

`tests/test_matrices.py` checks the shapes, sampled cells against `feedback()`, that the thread count does not change the bytes, and that the output equals what `uv run src/precompute.py` builds at the repo root. That last test is skipped if `uv` is missing or the reference build fails.

## Strategy

`strategy.py` holds `Strategy`, the same maths and tie-breaks as the Python package's Solver (see [solver-strategy.md](solver-strategy.md)), written again so this project stays standalone. `rank(candidates, pool=, scope=, by=, top=)` counts each Feedback Code in a matrix row restricted to the Candidate columns, then orders by the chosen measure, then (a Candidate first) the other measure, then alphabetically. Once two or fewer Candidates are left it searches Candidates only, whatever `scope` says. Candidates are Answer List indices; the matrices are never copied.

## Benchmark and openers

`benchmark.py` plays a Benchmark for each of three Strategies, every one from its own best Opener (the first pick of that Strategy on the full Answer List), under the Guess Limit of six:

| `id` | Strategy (`pool`, `scope`, `by`) | Opener |
| --- | --- | --- |
| `bits-all` | Expected Information over All words (`guesses`, `global`, `bits`) | tarse |
| `bits-candidates` | Expected Information over Candidates only (`answers`, `candidates`, `bits`) | raise |
| `expected-all` | Expected Candidates over All words (`guesses`, `global`, `expected`) | roate |

Answers that have had the same Feedback so far share a Candidate Set and so the next Guess, so they are played together as a tree with one `rank` call per node instead of one per Game; the Guess Counts are the same as playing each Game alone (a test checks this). A Game that needs more than six Guesses is a Loss and lands in `losses`, not in `distribution`; the Average Guess Count is over the won Games only.

Results on all 2,315 Answers (Guess Count 1 to 6, then Losses):

| Strategy | Opener | 1 | 2 | 3 | 4 | 5 | 6 | Losses | Average |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `bits-all` | tarse | 0 | 61 | 1256 | 943 | 53 | 2 | 0 | 3.429 |
| `bits-candidates` | raise | 1 | 131 | 999 | 919 | 207 | 47 | 11 | 3.582 |
| `expected-all` | roate | 0 | 55 | 1136 | 1084 | 40 | 0 | 0 | 3.479 |

`bits-candidates` agrees with the table in [solver-strategy.md](solver-strategy.md) (its average there, 3.60, counts the 11 Losses at 7 or 8 Guesses). The Python package has no Benchmark of its own; a throwaway script playing games with its `Solver` gave the same Opener and the same Guess Count for 58 sampled Answers in each Strategy.

The Opener leaderboard ranks every Guess List word as a first Guess by Expected Information (ties: Candidate first, then Expected Candidates, then alphabetical) and keeps the top 500. It stores the first-turn stats only, not a Benchmark per Opener.

`precompute` saves `benchmark.json` and `openers.json` next to the matrices. `api.py` reads them at startup if present; a missing file is not a startup error.

## API

`api.py` loads the matrices once at startup with mmap (in FastAPI's lifespan). They are never built there: if missing, startup fails with a message pointing to `just backend-precompute`. The Benchmark JSON files are loaded too but are optional: if one is missing, only its endpoint fails. Run it with `just backend` (uvicorn, `http://127.0.0.1:8000`; extra arguments go to uvicorn, e.g. `--port 8001 --reload`).

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

Invalid input (an unknown word, a malformed Feedback, a bad `pool`/`scope`/`by`, a missing parameter, `top` below 1 or not a number, an empty Candidate Set for `/api/split`) returns HTTP 400 with `{"detail": "<message>"}`; the `RequestValidationError` handler replaces FastAPI's 422. `/api/solve` stops after 12 Guesses as a safety limit. If `benchmark.json` or `openers.json` is missing, `/api/benchmark` or `/api/openers` returns HTTP 503 with `{"detail": "... Run `just backend-precompute` first."}`; the rest of the API still works.

`tests/test_api.py` uses FastAPI's `TestClient`; `tests/conftest.py` builds the matrices once only if they are missing. `tests/test_benchmark.py` runs the Benchmark on 12 Answers (tree play against one-Game-at-a-time play, the JSON shape, the 400 and 503 cases) and swaps its own results into the app, so it does not need the real JSON files.

## Commands

| Command | What it does |
| --- | --- |
| `just backend-precompute` | Write the Feedback matrices, the Benchmark and the Opener leaderboard to `app/backend/matrices/`. Takes `--threads N`, `--out DIR`, `--yes`, `--skip-benchmark`, `--benchmark-only` |
| `just backend` | Serve the API with uvicorn from `app/backend/`. Takes uvicorn options, e.g. `--port 8001` |
| `just test-backend` | Run the backend's tests (`uv run pytest` in `app/backend/`) |

The tests reuse the repeated-letter examples from [feedback-scoring.md](feedback-scoring.md).
