# Feedback matrices

The Solver picks Guesses from a Feedback Split, which needs the Feedback of a Guess against every Candidate. `packages/wordle/src/wordle/solver/matrix.py` scores every pair once, before any Game, and saves the results.

## The two matrices

| File | Rows | Columns | Shape |
| --- | --- | --- | --- |
| `answers_vs_answers.npy` | Answer List | Answer List | 2,315 × 2,315 |
| `guesses_vs_answers.npy` | Guess List | Answer List | 14,855 × 2,315 |

Rows and columns are both in sorted word order, so `matrix[g, a]` is the Feedback of Guess `g` against Answer `a`. Columns are always Answers because only Answer List words can be the Answer. The first matrix serves a Solver that only guesses Candidates; the second also lets it guess any valid word.

## Cell encoding

One `uint8` per cell: the five Marks (Absent 0, Present 1, Correct 2) as base-3 digits, first letter first. All Absent is 0, and a Win is 242 (`WIN`). Grouping a row's cells by value gives the Feedback Split.

## File format: `.npy`

The matrices are dense and have no column names, so a table format (CSV, Parquet) adds only cost. CSV is huge and slow to parse (the reference project's matrix is 99 MB as text); Parquet is columnar, built for tables. `.npy` stores the raw bytes (5 MB and 34 MB here), loads in milliseconds, and `np.load(..., mmap_mode="r")` reads rows straight from disk. Rust can read it with the `npyz` crate.

## Generating

`just matrices` (or `uv run src/matrices.py`) asks how many threads to use (1, 2, 4 or 8; about 4.4 s with one, 1.2 s with eight) and whether to overwrite existing files, then writes both files to `matrices/` at the repo root, which is gitignored. `--threads N`, `--out DIR` and `--yes` skip the questions. `matrix.load()` builds them if they are missing. The vectorised scoring follows the same two-pass rule as [feedback-scoring.md](feedback-scoring.md); `packages/wordle/tests/test_matrix.py` checks it against `wordle.engine.feedback.feedback`.
