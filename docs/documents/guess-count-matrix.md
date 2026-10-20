# Guess Count Matrix

`packages/wordle/src/wordle/solver/guess_count_matrix.py` answers "if I open with this word and the Solver plays the rest, how many Guesses does it take to Win, on average, across the Answer List?" for every Guess List word and each of the four [Strategies](solver-strategy.md). The Opener leaderboard ranks by Expected Information as a first Guess; this ranks by actual play, and the two disagree (salet beats raise, the Solver's own Opener, with the Candidates-only Strategy).

## Files

All under `precompute-cache/guess-counts/` (gitignored; `--out DIR` changes the root):

| File | Contents |
| --- | --- |
| `<strategy id>.npy` | `bits-candidates`, `expected-candidates`, `bits-all`, `expected-all`: 14,855 x 2,315 `uint8`, about 34 MB each |
| `summary.json` | the ranked Openers of every Strategy that has a file |

In a matrix, rows are Openers and columns are Answers, in the same sorted order as `guesses_vs_answers.npy` (see [Feedback matrices](feedback-matrices.md)). A cell is the Guess Count of that Game played to a Win with no Guess Limit, so a Loss keeps its real count; 13 (`UNSOLVED`) means the 12-Guess safety limit was hit. A row of zeros is not filled, since no Guess Count is 0. The file is created at full size and rows are written in place (`np.lib.format.open_memmap`); rows already in an existing file are kept, except those asked for, which are played again.

## Summary format

`summary.json` maps each Strategy id to `{id, name, complete_rows, openers}`. `openers` holds every Opener whose row is complete, ranked by Average Guess Count over all 2,315 Answers (Losses at their real count), then Expected Information as a first Guess (higher first), then alphabetically. Each entry:

```json
{"rank": 1, "word": "salet", "average_guess_count": 3.528, "losses": 8,
 "distribution": [0, 148, 1030, 946, 157, 26], "bits": 5.835, "is_answer": false}
```

`losses` counts Games needing more than 6 Guesses; `distribution` is Games won in 1 to 6 Guesses; `is_answer` says whether the word is on the Answer List. The summary is rebuilt from the whole matrix files at the end of every run, so rows from earlier runs count. `summarize(matrix, guesses, bits, answers)` is the pure ranking function.

## Building

`build(out=CACHE_DIR, strategies=STRATEGIES, openers=None, solver=None)` plays each Opener (default: the whole Guess List) with `guess_counts` ([tree play](solver-strategy.md)), one `NextGuessCache` shared by every Opener, one thread. It returns the paths written.

## The command

`just precompute-guess-counts` (`src/precompute_guess_counts.py` -> `wordle.solver.cli.precompute_guess_counts`):

- asks "Which Strategies?" (a checkbox, all four ticked); `--strategy ID` (repeatable) skips the question; Ctrl+C at the question exits without writing;
- `--out DIR` sets the output folder (default `precompute-cache/`);
- `--opener WORD` (repeatable) fills only those rows, for quick checks;
- prints each file with its size, the top 5 Openers per Strategy and the elapsed time.

Resume, threads and progress bars are not built yet.

## Cost

One thread. Measured: `bits-candidates` over all 14,855 Openers took 334 s (about 5.6 minutes); a global Strategy Opener takes about 5 to 9 s (`bits-all` with two Openers: 17 s), so a full global Strategy is an estimated 20 hours (not measured).

## Results

Top 5 for `bits-candidates` over the whole Guess List: salet 3.528 (8 Losses), slate 3.529 (7), least 3.537 (9), reast 3.539 (10), trace 3.540 (7). With `bits-all`, tarse 3.429 and salet 3.432, both with no Losses (only those two Openers filled).
