# Feedback matrices

The Solver picks Guesses from a Feedback Split, which needs the Feedback of a Guess against every Candidate. `packages/wordle/src/wordle/solver/matrix.py` scores every pair once, before any Game, and saves the results.

## The two matrices

| File | Rows | Columns | Shape |
| --- | --- | --- | --- |
| `answers_vs_answers.npy` | Answer List | Answer List | 2,315 × 2,315 |
| `guesses_vs_answers.npy` | Guess List | Answer List | 14,855 × 2,315 |

Rows and columns are both in sorted word order (byte order, the same in Python and Rust), so `matrix[g, a]` is the Feedback of Guess `g` against Answer `a`. Columns are always Answers because only Answer List words can be the Answer. The first matrix serves a Solver that only guesses Candidates; the second also lets it guess any valid word.

## Cell encoding

Each cell holds one Feedback, packed into a single `uint8` (0 to 255) by treating the five Marks as the digits of a base-3 number.

### Why base 3

A Mark has three values (Absent 0, Present 1, Correct 2; the `Mark` enum in `wordle/engine/feedback.py`), and a Feedback has five of them. That gives 3⁵ = 243 possible Feedbacks, numbered 0 to 242. Every Feedback gets exactly one number, and every number from 0 to 242 is a different Feedback, so nothing is lost. 243 fits in one byte with room to spare, where a text form such as `"O-XXO"` (what the reference project stores) costs five bytes per cell, has to be parsed, and cannot be compared or counted as fast as a number.

### Place values

It works like decimal, except each place is worth a power of 3 instead of a power of 10. The first letter is the most significant digit, so it reads in the same order as the Guess:

| Letter | 1st | 2nd | 3rd | 4th | 5th |
| --- | --- | --- | --- | --- | --- |
| Place value | 3⁴ = 81 | 3³ = 27 | 3² = 9 | 3¹ = 3 | 3⁰ = 1 |
| Mark values | 0, 1 or 2 | 0, 1 or 2 | 0, 1 or 2 | 0, 1 or 2 | 0, 1 or 2 |

The cell is each Mark times its place value, added up:

```
cell = m₀·81 + m₁·27 + m₂·9 + m₃·3 + m₄
```

The biggest possible sum is 2·81 + 2·27 + 2·9 + 2·3 + 2 = 242, which is why the numbers stop there. Because each place only ever holds 0, 1 or 2, no two Feedbacks can add up to the same number (the same reason 407 in decimal can only be 4, 0 and 7).

### Encoding in code

`score_matrix` builds the number one digit at a time with Horner's method. Start at 0, and for each letter left to right, multiply what you have by 3 and add the next Mark:

```python
code = 0
for mark in marks:          # first letter first
    code = code * 3 + mark  # shift everything one place left, then add the new digit
```

For Correct, Absent, Present, Absent, Correct (2, 0, 1, 0, 2) the steps are 0 → 2 → 6 → 19 → 57 → 173. In the matrix this runs on whole blocks of Guesses at once, with a `uint16` working array so intermediate sums are never at risk of overflowing; the finished block is stored back as `uint8`.

### Decoding in code

Undo it from the last letter backwards: the remainder after dividing by 3 is the last Mark, and the quotient is everything before it.

```python
def decode(cell: int) -> list[Mark]:
    marks = []
    for _ in range(5):
        cell, digit = divmod(cell, 3)
        marks.append(Mark(digit))
    return marks[::-1]       # we peeled the last letter first, so reverse

decode(173)  # [CORRECT, ABSENT, PRESENT, ABSENT, CORRECT]
```

### Properties worth knowing

- **0 means nothing matched:** all five letters Absent.
- **242 (`WIN`) means the Guess is the Answer.** It is the only cell that is all Correct.
- **Equal cells are equal Feedback.** Two Answers that give the same number for a Guess cannot be told apart by that Guess, so counting how often each number appears in a row is the Feedback Split. No decoding is needed to group or count.
- **Not every number occurs.** Four Correct and one Present is impossible (the Present letter would have to belong in the one spot already taken), which rules out 5 numbers. In the Guess matrix 238 of the 243 appear.

### Worked examples

Read the five Marks as base-3 digits, so the first letter is worth 81, then 27, 9, 3 and 1:

| Guess | Answer | Marks | Arithmetic | Cell |
| --- | --- | --- | --- | --- |
| crane | cable | Correct, Absent, Present, Absent, Correct | 2·81 + 0·27 + 1·9 + 0·3 + 2 | 173 |
| speed | abide | Absent, Absent, Present, Absent, Present | 0 + 0 + 1·9 + 0 + 1 | 10 |
| crane | zonal | Absent, Absent, Present, Present, Absent | 0 + 0 + 1·9 + 1·3 + 0 | 12 |
| crane | crane | all Correct | 2·81 + 2·27 + 2·9 + 2·3 + 2 | 242 |

To decode a cell, take it modulo 3 for the last letter, divide by 3, and repeat for each letter before it.

### Looking up a cell

Row `g` is the `g`th Guess in sorted order, column `a` is the `a`th Answer in sorted order. In `guesses_vs_answers.npy`, "crane" is row 2628 and "cable" is column 317:

```python
import numpy as np
from wordle.engine.words import load_word_lists

words = load_word_lists()
answers = words.answers                 # sorted tuple
guesses = tuple(sorted(words.guesses))

matrix = np.load("precompute-cache/feedback/guesses_vs_answers.npy", mmap_mode="r")
matrix[guesses.index("crane"), answers.index("cable")]   # 173
```

A whole row is that Guess against every Answer: `matrix[2628, :8]` is `[99, 20, 20, 10, 9, 36, 11, 10]` for the Answers `aback, abase, abate, abbey, abbot, abhor, abide, abled`. Counting the distinct values in a row gives the Feedback Split: "crane" produces 142 different Feedbacks across the 2,315 Answers, and the biggest group is 263 Answers that all give 0 (every letter Absent).

### On disk

An `.npy` file is a short header (128 bytes here, text such as `{'descr': '|u1', 'fortran_order': False, 'shape': (2315, 2315)}` padded with spaces) followed by the cells as raw `uint8` bytes, row by row. Cell `[g, a]` is therefore the byte at offset `128 + g * 2315 + a`, and the file size is the header plus one byte per cell (34,389,453 bytes for the Guess matrix: 14,855 × 2,315 + 128). Because it is just a flat array of bytes, `mmap_mode="r"` can read any row without loading the rest.

## File format: `.npy`

The matrices are dense and have no column names, so a table format (CSV, Parquet) adds only cost. CSV is huge and slow to parse (the reference project's matrix is 99 MB as text); Parquet is columnar, built for tables. `.npy` stores the raw bytes (5 MB and 34 MB here), loads in milliseconds, and `np.load(..., mmap_mode="r")` reads rows straight from disk. Rust reads it with a few lines of header parsing.

## Generating

`just precompute` (or `uv run src/precompute.py`) asks how many threads to use (1, 2, 4 or 8; about 4.4 s with one, 1.2 s with eight) and whether to overwrite existing files, then writes both files to `precompute-cache/feedback/` at the repo root, which is gitignored (`precompute-cache/` holds every precomputed file, shared by the package, the backend and the gpui app). `--threads N`, `--out DIR` and `--yes` skip the questions. `matrix.load()` builds them if they are missing. The vectorised scoring follows the same two-pass rule as [feedback-scoring.md](feedback-scoring.md); `packages/wordle/tests/test_matrix.py` checks it against `wordle.engine.feedback.feedback`.

## The gpui app builds them too

The Rust app writes the same files from its command palette (**Precompute matrices…**, see [gpui-app.md](gpui-app.md)), with `app/wordle-gpui/src/solver/matrix.rs`, into the same `precompute-cache/feedback/` (it finds the repo root from its own `CARGO_MANIFEST_DIR`, so the working directory does not matter). Both writers give byte-identical files, so it does not matter which one built them. The app reads the files with a small `.npy` header parser of its own in `solver/strategy.rs`, not the `npyz` crate, and refuses a file that is not `uint8` row by row. [`.npy` files in Python and Rust](npy-in-python-and-rust.md) compares the two byte by byte.

## The web backend builds them too

`app/backend/` reuses the package's builder: `just backend-precompute` calls `wordle.solver.matrix.build` and writes the same files into `precompute-cache/feedback/`, with the Benchmark and Opener JSON in `precompute-cache/benchmark/`. See [web-backend.md](web-backend.md).
