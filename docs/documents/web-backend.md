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

## Commands

| Command | What it does |
| --- | --- |
| `just backend-precompute` | Write the Feedback matrices to `app/backend/matrices/`. Takes `--threads N`, `--out DIR`, `--yes` |
| `just test-backend` | Run the backend's tests (`uv run pytest` in `app/backend/`) |

The tests reuse the repeated-letter examples from [feedback-scoring.md](feedback-scoring.md).
