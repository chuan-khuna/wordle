# Web backend

The Flask API behind the website, in `app/backend/`. It is a **standalone uv project**: not a member of the root workspace, and it never imports `packages/wordle`. Like `app/wordle-gpui`, it keeps its own copy of the word lists and its own implementation of Feedback and Candidates. The website's plan is in `.scratch/website/spec.md`.

## Layout

```
app/backend/
  pyproject.toml          flask, numpy; pytest as a dev tool
  wordle_backend/
    words.py              loads the Answer List and Guess List from data/
    feedback.py           the two-pass Feedback rule and Feedback Codes
    candidates.py         the Candidate Set for a State
    data/                 answers.txt, guesses.txt, SOURCES.md (copies of packages/wordle/src/wordle/data/)
  tests/
```

The root `pyproject.toml` only lists `packages/*` as members, so `app/backend/` has its own `.venv` and `uv.lock`. Run `uv` commands from inside it (the `just` recipes do).

## Feedback and Feedback Codes

`feedback(guess, answer)` is the rule in [feedback-scoring.md](feedback-scoring.md). Here the Marks are plain ints (Absent 0, Present 1, Correct 2), so a Feedback is a tuple of five ints. `pack` reads them as base-3 digits into a Feedback Code (0 to 242, 242 is a Win), the same encoding as the [Feedback matrices](feedback-matrices.md); `unpack` is its inverse.

## Candidates

A State is a tuple of `Turn(guess, feedback)`, where `feedback` is a Feedback Code. `candidates(state)` keeps each Answer whose Feedback for the Guess equals the Turn's code, one Turn after another; an empty State gives the whole Answer List. It scores on the fly, with no matrices, which is fast enough for a handful of Turns.

## Commands

| Command | What it does |
| --- | --- |
| `just test-backend` | Run the backend's tests (`uv run pytest` in `app/backend/`) |

The tests reuse the repeated-letter examples from [feedback-scoring.md](feedback-scoring.md).
