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
    api.py                the FastAPI app (`wordle_backend.api:app`)
    precompute.py         the command behind `just backend-precompute`
    data/                 answers.txt, guesses.txt, SOURCES.md (copies of packages/wordle/src/wordle/data/)
  matrices/               generated .npy files (gitignored)
  tests/
```

The root `pyproject.toml` only lists `packages/*` as members, so `app/backend/` has its own `.venv` and `uv.lock`. Run `uv` commands from inside it (the `just` recipes do).

## Feedback and Feedback Codes

`feedback(guess, answer)` is the rule in [feedback-scoring.md](feedback-scoring.md). Here the Marks are plain ints (Absent 0, Present 1, Correct 2), so a Feedback is a tuple of five ints. `pack` reads them as base-3 digits into a Feedback Code (0 to 242, 242 is a Win), the same encoding as the [Feedback matrices](feedback-matrices.md); `unpack` is its inverse.

## Candidates

A State is a tuple of `Turn(guess, feedback)`, where `feedback` is a Feedback Code. `candidates(state)` keeps each Answer whose Feedback for the Guess equals the Turn's code, one Turn after another; an empty State gives the whole Answer List. It scores on the fly, with no matrices, which is fast enough for a handful of Turns.

## Feedback matrices

`matrices.py` scores every Guess against every Answer with the same vectorised two-pass rule as the Python package, in blocks of 256 Guesses, optionally on several threads (numpy releases the GIL, and each block writes its own rows). It writes `answers_vs_answers.npy` and `guesses_vs_answers.npy` into `app/backend/matrices/` (gitignored): rows are Guesses and columns are Answers in sorted order, each cell a Feedback Code as a `uint8`. The files are byte-identical to the ones `packages/wordle` and the gpui app write; see [feedback-matrices.md](feedback-matrices.md) for the encoding and format. `load()` memory-maps them, building them first if missing.

`just backend-precompute` runs `wordle_backend.precompute`, which takes `--threads N` (default 1), `--out DIR` and `--yes` (otherwise it asks before overwriting). It takes about 4 s with one thread and about 1 s with four. Unlike the Python command it never asks for the thread count.

`tests/test_matrices.py` checks the shapes, sampled cells against `feedback()`, that the thread count does not change the bytes, and that the output equals what `uv run src/precompute.py` builds at the repo root. That last test is skipped if `uv` is missing or the reference build fails.

## Strategy

`strategy.py` holds `Strategy`, the same maths and tie-breaks as the Python package's Solver (see [solver-strategy.md](solver-strategy.md)), written again so this project stays standalone. `rank(candidates, pool=, scope=, by=, top=)` counts each Feedback Code in a matrix row restricted to the Candidate columns, then orders by the chosen measure, then (a Candidate first) the other measure, then alphabetically. Once two or fewer Candidates are left it searches Candidates only, whatever `scope` says. Candidates are Answer List indices; the matrices are never copied.

## API

`api.py` loads the matrices once at startup with mmap (in FastAPI's lifespan). They are never built there: if missing, startup fails with a message pointing to `just backend-precompute`. Run it with `just backend` (uvicorn, `http://127.0.0.1:8000`; extra arguments go to uvicorn, e.g. `--port 8001 --reload`).

Words are lowercase five-letter strings. A Feedback is written as **five digits, one per letter: 0 Absent, 1 Present, 2 Correct** (`"20102"`), the base-3 digits of its Feedback Code; the emoji squares are for display only. Every response with a Feedback gives both `marks` (that string) and `code` (the Feedback Code). A State is `[{guess, feedback}]` with `feedback` as the digit string. `pool`, `scope` and `by` are as in [solver-strategy.md](solver-strategy.md) (defaults `guesses`, `global`, `bits`). A "WordStats" below is `{word, bits, expected_candidates, groups, largest_group, is_candidate, win_chance}`.

| Endpoint | Request | Response |
| --- | --- | --- |
| `GET /api/feedback` | `guess`, `answer` (any Guess List words) | `{guess, answer, marks, code}` |
| `POST /api/candidates` | `{state}` | `{count, words}` |
| `POST /api/split` | `{guess, state}` | WordStats fields of the Guess, plus `candidates` and `split`: `[{marks, code, count, words}]`, biggest group first |
| `POST /api/suggestions` | `{state, pool, scope, by, top}` (`top` default 10) | `{candidates, suggestions: [WordStats]}`, best first |
| `GET /api/solve` | `answer` (Answer List word), `pool`, `scope`, `by` | `{answer, solved, guesses, steps}`; each step is `{number, guess, marks, code, candidates_before, candidates_after, alternatives: [WordStats]}`, with the top 5 for that step (the first is the Guess played) |

Invalid input (an unknown word, a malformed Feedback, a bad `pool`/`scope`/`by`, a missing parameter, `top` below 1, an empty Candidate Set for `/api/split`) returns HTTP 400 with `{"detail": "<message>"}`; the `RequestValidationError` handler replaces FastAPI's 422. `/api/solve` stops after 12 Guesses as a safety limit.

`tests/test_api.py` uses FastAPI's `TestClient`; `tests/conftest.py` builds the matrices once only if they are missing.

## Commands

| Command | What it does |
| --- | --- |
| `just backend-precompute` | Write the Feedback matrices to `app/backend/matrices/`. Takes `--threads N`, `--out DIR`, `--yes` |
| `just backend` | Serve the API with uvicorn from `app/backend/`. Takes uvicorn options, e.g. `--port 8001` |
| `just test-backend` | Run the backend's tests (`uv run pytest` in `app/backend/`) |

The tests reuse the repeated-letter examples from [feedback-scoring.md](feedback-scoring.md).
