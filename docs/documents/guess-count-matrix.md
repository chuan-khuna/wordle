# Guess Count Matrix

`packages/wordle/src/wordle/solver/guess_count_matrix.py` answers "if I open with this word and the Solver plays the rest, how many Guesses does it take to Win, on average, across the Answer List?" for every Guess List word and each of the four [Strategies](solver-strategy.md). The Opener leaderboard ranks by Expected Information as a first Guess; this ranks by actual play, and the two disagree (salet beats raise, the Solver's own Opener, with the Candidates-only Strategy).

## Files

All under `precompute-cache/guess-counts/` (gitignored; `--out DIR` changes the root):

| File | Contents |
| --- | --- |
| `<strategy id>.npy` | `bits-candidates`, `expected-candidates`, `bits-all`, `expected-all`: 14,855 x 2,315 `uint8`, about 34 MB each |
| `manifest.json` | the format version, the word lists (row and column order), each Strategy's definition, the safety limit and the tool that wrote it |
| `summary.json` | the ranked Openers of every Strategy that has a file the manifest vouches for, compact JSON |
| `<strategy id>.ranking.csv` | the same ranking as `summary.json` for one Strategy, for a spreadsheet |

Why uncompressed `.npy` with a manifest and these readable files: [ADR 0001](../adr/0001-guess-count-matrix-file-format.md). How one file looks byte by byte, and the contract a second writer must follow: [`.npy` files in Python and Rust](npy-in-python-and-rust.md).

In a matrix, rows are Openers and columns are Answers, in the same sorted order as `guesses_vs_answers.npy` (see [Feedback matrices](feedback-matrices.md)). A cell is the Guess Count of that Game played to a Win with no Guess Limit, so a Loss keeps its real count; 13 (`UNSOLVED`) means the 12-Guess safety limit was hit. A row of zeros is not filled, since no Guess Count is 0. The file is created at full size and rows are written in place (`np.lib.format.open_memmap`); rows already in an existing file are kept, except those asked for, which are zeroed and played again (see [Resuming](#resuming)).

## Manifest

`manifest.json` is written before any row, as compact JSON through a temporary file renamed over the old one:

```json
{"format_version": 1, "tool": "wordle precompute-guess-counts (python)", "safety_limit": 12,
 "strategies": {"bits-candidates": {"name": "Expected Information, Candidates only",
   "pool": "answers", "scope": "candidates", "ranked_by": "bits"}},
 "rows": ["aahed", "aalii", ...], "columns": ["aback", "abase", ...]}
```

`rows` is the whole sorted Guess List and `columns` the Answer List, so anyone can map indices to words without the package. `strategies` keeps the entries of Strategies not chosen in this run while the word lists stay the same, so running one Strategy does not orphan another's matrix. `mismatch(out, strategy, solver)` says why a matrix can't be resumed (no manifest; different word lists, format version or safety limit; or the Strategy defined differently), or `None`. A matrix the manifest does not vouch for is also left out of `summary.json` and gets no ranking CSV.

## Summary format

`summary.json` maps each Strategy id to `{id, name, complete_rows, openers}`. `openers` holds every Opener whose row is complete, ranked by Average Guess Count over all 2,315 Answers (Losses at their real count), then Expected Information as a first Guess (higher first), then alphabetically. Each entry:

```json
{"rank": 1, "word": "salet", "average_guess_count": 3.528, "losses": 8,
 "distribution": [0, 148, 1030, 946, 157, 26], "bits": 5.835, "is_answer": false}
```

`losses` counts Games needing more than 6 Guesses; `distribution` is Games won in 1 to 6 Guesses; `is_answer` says whether the word is on the Answer List. The summary is written compact (no indent, one line) and rebuilt from the whole matrix files at the end of every run, Ctrl+C included, so rows from earlier runs count and `complete_rows` says how far each Strategy has got. `summarize(matrix, guesses, bits, answers)` is the pure ranking function.

## Ranking CSV

Each run also writes `<strategy id>.ranking.csv` per Strategy in the summary, from the same entries, with the standard library's `csv` (`write_ranking`):

```csv
rank,opener,average_guess_count,losses,won_in_1,won_in_2,won_in_3,won_in_4,won_in_5,won_in_6,bits,is_answer
1,salet,3.52829373650108,8,0,148,1030,946,157,26,5.834581525865648,False
```

`opener` is the summary's `word` and `won_in_1` to `won_in_6` its `distribution`; floats are Python's shortest round-trip form and `is_answer` is `True` or `False`.

## Building

`build(out=CACHE_DIR, strategies=STRATEGIES, openers=None, solver=None, fresh=False, threads=1, progress=False, after_row=None)` plays each Opener with `guess_counts` ([tree play](solver-strategy.md)). Without `openers` it plays only the rows that still have a zero cell; with `openers` it plays those rows again, finished or not. `fresh=True` deletes each chosen Strategy's matrix first. `after_row(strategy, row)` is called once each row is committed (the tests use it to press Ctrl+C mid-run). It returns the paths written, `summary.json` last.

### Threads

The rows to play, across every chosen Strategy (one Strategy's rows after another), form one job list. `threads` worker threads take the next job from it under a lock, play it, and hand back the row's Guess Counts on a queue. They share one `Solver` (so one memory map of the Feedback Matrices) and one `NextGuessCache` (a plain dict; two threads missing on the same Candidate Set both search and store the same word, which is harmless).

The calling thread is the only writer: it takes each finished row off the queue and commits it (zeroed, then written whole), calls `after_row`, updates the overall bar and flushes every 10 s. So a worker writes only its own row's counts, never the file, and every [resume rule](#resuming) holds unchanged with several threads. Rows may finish in any order, but each row's counts depend only on its Strategy and Opener (the cached search is deterministic), so the files are byte-identical whatever the thread count (tested with 1 and 4 threads).

On Ctrl+C (or an error in a worker) the calling thread sets a stop flag; each worker notices it at its next settled group of Answers, drops its Opener in flight without writing it, and exits. Then the matrices are flushed and the summary written as with one thread.

### Progress bars

With `progress=True` (the command always sets it), tqdm draws on stderr:

- **Openers** (position 0): rows committed out of the rows to fill across every chosen Strategy, with rate and time left. On a resume the total also counts the rows already complete and the bar starts there, so it reads "rows done of 14,855 × Strategies"; with `--opener` it counts only those rows.
- **One bar per worker** (positions 1 to `threads`, each on its own line, so they never write over each other): labelled `<strategy id> <opener>`, Answers settled out of 2,315. `guess_counts` takes a `settled(n)` callback, called each time a group of `n` Answers gets its Guess Count; the bar resets for each Opener and is removed when its worker ends.

## Resuming

A stopped run picks up where it left off:

- **Only zero rows are filled.** A plain run plays every row with a zero cell and leaves complete rows untouched, so running again after a stop continues from the first unfinished Opener.
- **Rows are committed whole.** A row is written only once its Opener is fully played, and it is zeroed before the new counts go in, so a stop mid-write leaves a zero row (played again next time), never a mix of old and new counts.
- **Flushed regularly.** The memory map is flushed every 10 seconds (`FLUSH_SECONDS`) and when each Strategy's pass ends, so a crash loses at most the rows of those seconds.
- **The manifest must match.** Without `fresh`, if a chosen Strategy's matrix has rows and `mismatch` gives a reason, `build` raises `ManifestMismatch` before writing anything. The command turns this into "Can't resume <id>: <reason>. Run again with --fresh to start it over."
- **Ctrl+C during the run** stops after flushing the finished rows, still writes `summary.json` and the ranking CSVs with the rows complete so far, then raises `KeyboardInterrupt` again; the command catches it and says to run again to resume.

## The command

`just precompute-guess-counts` (`src/precompute_guess_counts.py` -> `wordle.solver.cli.precompute_guess_counts`):

- asks "How many threads?" with the same choices as `just precompute` (1, 2, 4, 8; `THREAD_CHOICES`); `--threads N` skips the question; Ctrl+C at the question exits without writing;
- asks "Which Strategies?" (a checkbox, all four ticked); `--strategy ID` (repeatable) skips the question; Ctrl+C at the question exits without writing;
- `--out DIR` sets the output folder (default `precompute-cache/`);
- `--opener WORD` (repeatable) fills only those rows, played again even if finished, for quick checks;
- if any chosen Strategy already has rows, shows how many each has and asks "Resume, start over or cancel?" with resume as the default; start over clears the chosen matrices (`fresh`); cancel, or Ctrl+C at the question, exits without writing anything;
- `--yes` resumes without asking and `--fresh` starts over without asking (the two can't be combined); a matrix whose manifest does not match stops the command before the question, even with `--yes`;
- shows the [progress bars](#progress-bars) while it runs;
- Ctrl+C during the run keeps the finished rows and writes a partial summary (see [Resuming](#resuming)), with any thread count;
- prints each file in `guess-counts/` with its size, the top 5 Openers per Strategy and the elapsed time with the thread count.

Both commands share `add_threads_flag` and `ask_threads` in `wordle/solver/cli.py`.

## In the gpui app

The gpui app builds the same files from Rust, into its own `precompute-cache/guess-counts-rust/` so the two tools never write the same file, with **Precompute guess counts…** in its menu and palette (see [gpui desktop app](gpui-app.md#precompute-guess-counts)): a picker for the thread count (1, 2, 4, 8) and the Strategies, progress in the status bar, and a stop that keeps finished rows. `solver/guess_counts.rs` is the tree play (a `Player` per thread, each with its own next-Guess cache) and `solver/guess_count_matrix.rs` the build, manifest, summary and CSV. It follows the [contract](npy-in-python-and-rust.md#contract-for-a-second-writer-of-the-guess-count-matrix): the same `.npy` header and rows, `manifest.json` that differs only in `tool` (`wordle-gpui Precompute guess counts (rust)`), and `summary.json` and the CSVs byte for byte as Python writes them from the same matrices (the tests compare rows of all four Strategies and the summary files with Python's). Since the format is the same, copying the files of one folder into the other (`cp precompute-cache/guess-counts/* precompute-cache/guess-counts-rust/`) hands the work over: the other tool checks the manifest and fills only the rows still zero.

Differences from the Python command: it only resumes (no start over; a manifest mismatch stops it before anything is written and says to delete `precompute-cache/guess-counts-rust/`), and the library's `openers` fills only those rows that are unfinished rather than playing them again. The threads take chunks of 8 consecutive rows; the file is synced every 10 s and at the end of each Strategy's pass; a stop drops the Openers in flight and still writes the summary.

## Cost

One thread. Measured: `bits-candidates` over all 14,855 Openers took 334 s (about 5.6 minutes); a global Strategy Opener takes about 5 to 9 s (`bits-all` with two Openers: 17 s), so a full global Strategy is an estimated 20 hours (not measured).

### Threads

Measured on an Apple M1 Pro (8 performance + 2 efficiency cores, 32 GB, macOS / Darwin 27.2.0 arm64), CPython 3.14.0 with the GIL, `build` called directly (no bars) into a temporary folder, each run with a fresh `NextGuessCache`. Openers are every `len(guesses) // n`-th Guess List word, so a spread of the alphabet rather than the best Openers.

| Strategy | Openers | 1 thread | 2 threads | 4 threads | 8 threads |
| --- | --- | --- | --- | --- | --- |
| `bits-candidates` | 300 | 10.1 s | 13.2 s | 20.8 s | 31.9 s |
| `expected-candidates` | 300 | 10.9 s | | 20.8 s | 30.8 s |
| `bits-all` | 24 | 199.1 s | | 77.6 s (2.6x) | 59.5 s (3.3x) |
| `expected-all` | 24 | 209.3 s | | | 56.8 s (3.7x) |

- **Candidates-only Strategies get slower with threads** (3x slower on 8). Their search is over a small Candidate Set, so the time goes on Python between short numpy calls, which holds the GIL; more threads only add contention. Use 1 thread for them.
- **Global Strategies speed up, but well short of the thread count**: 2.6x on 4 threads, 3.3x to 3.7x on 8. Each search scores the whole Guess List against the Candidates in numpy, which lets go of the GIL, but the Python around it does not. At about 8.5 s per Opener on one thread (this spread of Openers; the cache warms over a full run), a full global Strategy is roughly 35 hours on 1 thread and 9 to 10 hours on 8 (an estimate, not measured).
- A run that mixes both kinds uses one thread count for all; choose 1 for Candidates-only runs and 8 for global ones. Running the work in processes instead of threads is left to a follow-up (ticket 07).

### The gpui app (Rust)

Same machine, release build, `measure_a_build` (an ignored test in `solver/guess_count_matrix_tests.rs`) into a temporary folder, each run with fresh caches. Another agent's Python runs kept the load average at 15 to 30 during these runs, so the times are pessimistic.

| Strategy | Openers | Threads | Time | Per Opener |
| --- | --- | --- | --- | --- |
| `bits-candidates` | all 14,855 | 8 | 11.0 s | |
| `expected-candidates` | all 14,855 | 8 | 3.8 s | |
| `bits-all` | 50 (every 300th) | 1 | 36.2 s | 0.72 s |
| `bits-all` | 991 (every 15th) | 8 | 102.5 s | 0.103 s |
| `expected-all` | 199 (every 75th) | 8 | 12.9 s | 0.065 s |

Extrapolated from those samples (not measured): a full `bits-all` takes about 14,855 × 0.103 s ≈ 26 minutes on 8 threads (about 3 hours on 1), and `expected-all` about 16 minutes on 8 threads, against an estimated 9 to 35 hours for the Python command. Ranking by Expected Candidates is cheaper because Σ n² is compared as an integer and the bits are worked out only to break a tie. The full Rust `bits-candidates` matrix equals the 6,442 rows the Python command had finished, and its top 5 are the ones under [Results](#results).

## Results

Top 5 for `bits-candidates` over the whole Guess List: salet 3.528 (8 Losses), slate 3.529 (7), least 3.537 (9), reast 3.539 (10), trace 3.540 (7). With `bits-all`, tarse 3.429 and salet 3.432, both with no Losses (only those two Openers filled).
