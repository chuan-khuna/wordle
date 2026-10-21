# Guess Count Matrix

`packages/wordle/src/wordle/solver/guess_count_matrix.py` answers "if I open with this word and the Solver plays the rest, how many Guesses does it take to Win, on average, across the Answer List?" for every word of a Strategy's Guess Pool and each of the eight [Strategies](solver-strategy.md#the-eight-strategies). The Opener leaderboard ranks by Expected Information as a first Guess; this ranks by actual play, and the two disagree (salet beats raise, the Solver's own Opener, with the Guess List and Candidates only).

## Files

All under `precompute-cache/guess-counts/` (gitignored; `--out DIR` changes the root), in one folder per Ranking (format version 2):

```
guess-counts/
  manifest.json
  summary.json
  bits/
    answers-candidates.npy            2,315 × 2,315
    answers-candidates.ranking.csv
    answers-all.npy                   2,315 × 2,315
    guesses-candidates.npy           14,855 × 2,315
    guesses-all.npy                  14,855 × 2,315
    (and a ranking CSV beside each)
  expected/
    (the same four, and their ranking CSVs)
```

| File | Contents |
| --- | --- |
| `<ranking>/<pool>-<scope>.npy` | one per Strategy (its `path`, such as `bits/answers-candidates.npy` for `bits-answers-candidates`): `uint8`, one row per Guess Pool word, so 2,315 x 2,315 (about 5.4 MB) for the Answer List and 14,855 x 2,315 (about 34 MB) for the Guess List |
| `manifest.json` | the format version, the word lists (the rows of each Guess Pool and the columns), each Strategy's definition and path, the safety limit and the tool that wrote it |
| `summary.json` | the ranked Openers of every Strategy that has a file the manifest vouches for, compact JSON |
| `<ranking>/<pool>-<scope>.ranking.csv` | the same ranking as `summary.json` for one Strategy, for a spreadsheet |

Why uncompressed `.npy` with a manifest and these readable files: [ADR 0001](../adr/0001-guess-count-matrix-file-format.md). How one file looks byte by byte, and the contract a second writer must follow: [`.npy` files in Python and Rust](npy-in-python-and-rust.md).

In a matrix, rows are Openers (the Strategy's whole Guess Pool, since the Opener may be any Guess Pool word under either Search Scope) and columns are Answers, in the same sorted order as `answers_vs_answers.npy` or `guesses_vs_answers.npy` (see [Feedback matrices](feedback-matrices.md)). The Answer List rows of a `guesses-candidates` matrix are exactly its `answers-candidates` matrix: after the Opener, Candidates only guesses only Candidates, which are all on the Answer List, so the Guess Pool makes no difference. A cell is the Guess Count of that Game played to a Win with no Guess Limit, so a Loss keeps its real count; 13 (`UNSOLVED`) means the 12-Guess safety limit was hit. A row of zeros is not filled, since no Guess Count is 0. The file is created at full size and rows are written in place (`np.lib.format.open_memmap`); rows already in an existing file are kept, except those asked for, which are zeroed and played again (see [Resuming](#resuming)).

## Manifest

`manifest.json` is written before any row, as compact JSON through a temporary file renamed over the old one:

```json
{"format_version": 2, "tool": "wordle precompute-guess-counts (python)", "safety_limit": 12,
 "strategies": {"bits-answers-candidates": {"name": "Expected Information, Answer List, Candidates only",
   "pool": "answers", "scope": "candidates", "ranked_by": "bits", "path": "bits/answers-candidates.npy"}},
 "rows": {"answers": ["aback", "abase", ...], "guesses": ["aahed", "aalii", ...]},
 "columns": ["aback", "abase", ...]}
```

`rows` maps each Guess Pool to its sorted words (the rows of every matrix with that `pool`) and `columns` is the Answer List, so anyone can map indices to words without the package. Each Strategy's `path` is relative to `guess-counts/`. `strategies` keeps the entries of Strategies not chosen in this run while the word lists stay the same, so running one Strategy does not orphan another's matrix. `mismatch(out, strategy, solver)` says why a matrix can't be resumed (no manifest; a manifest of another format version; different word lists or safety limit; or the Strategy defined differently), or `None`.

A version 1 folder (flat `<old id>.npy` files such as `bits-candidates.npy`, every matrix 14,855 rows, `rows` a plain list) is never read as version 2. `folder_mismatch(out)` gives the reason for the whole folder, "manifest.json was written by format version 1; migrate it with `just migrate-guess-counts`", and `mismatch` gives the same one for every Strategy. Without `fresh`, `build` refuses such a folder before writing anything, even for a Strategy with no rows yet, so the version 1 manifest is not overwritten before it is migrated. A matrix the manifest does not vouch for is also left out of `summary.json` and gets no ranking CSV. To turn a version 1 folder into version 2 without playing again, see [Migrating a version 1 folder](#migrating-a-version-1-folder).

## Summary format

`summary.json` maps each Strategy id to `{id, name, complete_rows, openers}`. `openers` holds every Opener of that Strategy's own rows (its Guess Pool) whose row is complete, ranked by Average Guess Count over all 2,315 Answers (Losses at their real count), then Expected Information as a first Guess (higher first), then alphabetically. Each entry:

```json
{"rank": 1, "word": "salet", "average_guess_count": 3.528, "losses": 8,
 "distribution": [0, 148, 1030, 946, 157, 26], "bits": 5.835, "is_answer": false}
```

`losses` counts Games needing more than 6 Guesses; `distribution` is Games won in 1 to 6 Guesses; `is_answer` says whether the word is on the Answer List (always true for an Answer List Strategy). The summary is written compact (no indent, one line) and rebuilt from the whole matrix files at the end of every run, Ctrl+C included, so rows from earlier runs count and `complete_rows` says how far each Strategy has got. `summarize(matrix, guesses, bits, answers)` is the pure ranking function.

## Ranking CSV

Each run also writes `<ranking>/<pool>-<scope>.ranking.csv` beside each matrix in the summary, from the same entries, with the standard library's `csv` (`write_ranking`):

```csv
rank,opener,average_guess_count,losses,won_in_1,won_in_2,won_in_3,won_in_4,won_in_5,won_in_6,bits,is_answer
1,salet,3.52829373650108,8,0,148,1030,946,157,26,5.834581525865648,False
```

`opener` is the summary's `word` and `won_in_1` to `won_in_6` its `distribution`; floats are Python's shortest round-trip form and `is_answer` is `True` or `False`.

## Building

`build(out=CACHE_DIR, strategies=STRATEGIES, openers=None, solver=None, fresh=False, threads=1, progress=False, after_row=None)` plays each Opener with `guess_counts` ([tree play](solver-strategy.md)). Each matrix is created at `len(pool) × 2,315` under its Ranking's folder. Without `openers` it plays only the rows that still have a zero cell; with `openers` it plays those rows again, finished or not, and skips an Opener that is not in a Strategy's Guess Pool for that Strategy (so `--opener salet` fills only the Guess List matrices). `fresh=True` deletes each chosen Strategy's matrix first. `after_row(strategy, row)` is called once each row is committed (the tests use it to press Ctrl+C mid-run). It returns the paths written, `summary.json` last.

### Threads

The rows to play, across every chosen Strategy (one Strategy's rows after another), form one job list. `threads` worker threads take the next job from it under a lock, play it, and hand back the row's Guess Counts on a queue. They share one `Solver` (so one memory map of the Feedback Matrices) and one `NextGuessCache` (a plain dict; two threads missing on the same Candidate Set both search and store the same word, which is harmless).

The calling thread is the only writer: it takes each finished row off the queue and commits it (zeroed, then written whole), calls `after_row`, updates the overall bar and flushes every 10 s. So a worker writes only its own row's counts, never the file, and every [resume rule](#resuming) holds unchanged with several threads. Rows may finish in any order, but each row's counts depend only on its Strategy and Opener (the cached search is deterministic), so the files are byte-identical whatever the thread count (tested with 1 and 4 threads).

On Ctrl+C (or an error in a worker) the calling thread sets a stop flag; each worker notices it at its next settled group of Answers, drops its Opener in flight without writing it, and exits. Then the matrices are flushed and the summary written as with one thread.

### Progress bars

With `progress=True` (the command always sets it), tqdm draws on stderr:

- **Openers** (position 0, the label yellow through `termcolor`): rows committed out of the rows to fill across every chosen Strategy, with rate and time left. On a resume the total also counts the rows already complete and the bar starts there, so it reads "rows done of the rows of every chosen Strategy" (2,315 or 14,855 each); with `--opener` it counts only those rows.
- **One bar per worker** (positions 1 to `threads`, each on its own line, so they never write over each other): labelled `<strategy id> <opener>`, Answers settled out of 2,315. `guess_counts` takes a `settled(n)` callback, called each time a group of `n` Answers gets its Guess Count; the bar resets for each Opener and is removed when its worker ends.

## Resuming

A stopped run picks up where it left off:

- **Only zero rows are filled.** A plain run plays every row with a zero cell and leaves complete rows untouched, so running again after a stop continues from the first unfinished Opener.
- **Rows are committed whole.** A row is written only once its Opener is fully played, and it is zeroed before the new counts go in, so a stop mid-write leaves a zero row (played again next time), never a mix of old and new counts.
- **Flushed regularly.** The memory map is flushed every 10 seconds (`FLUSH_SECONDS`) and when each Strategy's pass ends, so a crash loses at most the rows of those seconds.
- **The manifest must match.** Without `fresh`, if the folder's manifest is another format version (a version 1 folder), or a chosen Strategy's matrix has rows and `mismatch` gives a reason, `build` raises `ManifestMismatch` before writing anything. The command turns these into "Can't use <folder>: <reason>, or run again with --fresh to start the chosen matrices over." and "Can't resume <id>: <reason>. Run again with --fresh to start it over."
- **Ctrl+C during the run** stops after flushing the finished rows, still writes `summary.json` and the ranking CSVs with the rows complete so far, then raises `KeyboardInterrupt` again; the command catches it and says to run again to resume.

## The command

`just precompute-guess-counts` (`src/precompute_guess_counts.py` -> `wordle.solver.cli.precompute_guess_counts`):

- asks "How many threads?" with the same choices as `just precompute` (1, 2, 4, 8; `THREAD_CHOICES`); `--threads N` skips the question; Ctrl+C at the question exits without writing;
- asks "Which Strategies?" (a checkbox of the eight display names, all ticked); `--strategy ID` (repeatable, one of the eight ids such as `bits-answers-all`) skips the question; Ctrl+C at the question exits without writing;
- `--out DIR` sets the output folder (default `precompute-cache/`);
- `--opener WORD` (repeatable) fills only those rows, played again even if finished, for quick checks (in the Strategies whose Guess Pool has the word);
- refuses a version 1 folder, pointing at `just migrate-guess-counts` (or `--fresh`);
- if any chosen Strategy already has rows, shows how many each has and asks "Resume, start over or cancel?" with resume as the default; start over clears the chosen matrices (`fresh`); cancel, or Ctrl+C at the question, exits without writing anything;
- `--yes` resumes without asking and `--fresh` starts over without asking (the two can't be combined); a matrix whose manifest does not match stops the command before the question, even with `--yes`;
- shows the [progress bars](#progress-bars) while it runs;
- Ctrl+C during the run keeps the finished rows and writes a partial summary (see [Resuming](#resuming)), with any thread count;
- prints each file in `guess-counts/`, `bits/` and `expected/` with its size, the top 5 Openers per Strategy and the elapsed time with the thread count.

Both commands share `add_threads_flag` and `ask_threads` in `wordle/solver/cli.py`.

## Migrating a version 1 folder

`just migrate-guess-counts` (`src/migrate_guess_counts.py` -> `wordle.solver.cli.migrate_guess_counts`, library code in `wordle/solver/guess_count_migration.py`) turns a version 1 folder into version 2 in place, copying rows rather than playing them again:

| Version 1 file | Version 2 file(s) |
| --- | --- |
| `<ranking>-candidates.npy` (14,855 rows) | `<ranking>/guesses-candidates.npy` (every row, byte for byte), and `<ranking>/answers-candidates.npy` (its 2,315 Answer List rows, in Answer List order) |
| `<ranking>-all.npy` (14,855 rows) | `<ranking>/guesses-all.npy` (every row) |

`<ranking>/answers-all.npy` has no version 1 source; it is new to play with `just precompute-guess-counts`.

- **What it checks first** (`plan(out, solver)`, which raises `MigrationRefused`): there is a `manifest.json`, it is format version 1 (an already version 2 folder is refused), its safety limit, `rows` (the Guess List) and `columns` (the Answer List) are the current ones, each version 1 matrix on disk has its entry in `strategies` with the version 1 `pool`, `scope` and `ranked_by`, and is `uint8` 14,855 x 2,315. Only the version 1 matrices that exist are migrated; there must be at least one. Nothing is written when a check fails.
- **Zero rows stay zero.** Rows are copied as they are, so an unfinished row stays unfinished, the migrated manifest vouches for the matrix, and a plain `just precompute-guess-counts` resumes it.
- **Order.** Each new matrix is written through a temporary file renamed into place; then the version 2 manifest (with an entry for each migrated Strategy only), then `summary.json` and the ranking CSVs (`write_summary`, so the Answer List matrices get their own rankings); only then are the version 1 `<old id>.npy` and `<old id>.ranking.csv` files removed. A stop before the manifest is written leaves a version 1 folder to migrate again.
- **The command** prints which file becomes which and asks "Migrate <folder> to format version 2?" (manifest, summary and ranking CSVs are overwritten, the version 1 files removed), default no; `--yes` skips the question and `--out DIR` sets the folder holding `guess-counts/` (default `precompute-cache/`). A refused folder exits with "Can't migrate <folder>: <reason>." It prints each file written with its size.

A version 1 backup in `data/precompute/` restores as it was (`just restore-cache`), and the migration then gives the version 2 folder (see [Precompute backup](precompute-backup.md)).

## In the gpui app

The gpui app still writes the version 1 layout (four Strategies under the old ids, flat `<id>.npy` files of 14,855 rows) until [eight-strategies ticket 03](../../.scratch/eight-strategies/issues/03-gpui-eight-strategies.md); the Python command refuses such a folder until it is migrated (see [Migrating a version 1 folder](#migrating-a-version-1-folder)). What follows describes the gpui build as it was written for version 1.

The gpui app builds the same files from Rust, into the same `precompute-cache/guess-counts/`, with **Precompute guess counts…** in its menu and palette (see [gpui desktop app](gpui-app.md#precompute-guess-counts)): a picker for the thread count (1, 2, 4, 8) and the Strategies, a precompute view in place of the board with progress (overall and per Strategy, rate, time left) and a log (each finished Opener, flushes, the end), and a stop that keeps finished rows. `solver/guess_counts.rs` is the tree play (a `Player` per thread, each with its own next-Guess cache) and `solver/guess_count_matrix.rs` the build, manifest, summary and CSV. It follows the [contract](npy-in-python-and-rust.md#contract-for-a-second-writer-of-the-guess-count-matrix): the same `.npy` header and rows, `manifest.json` that differs only in `tool` (`wordle-gpui Precompute guess counts (rust)`), and `summary.json` and the CSVs byte for byte as Python writes them from the same matrices (the tests compare rows of all four Strategies and the summary files with Python's). Since the format and the folder are the same, either tool picks up where the other stopped: it checks the manifest and fills only the rows still zero. Both directions are tested (`a_folder_copied_from_the_python_command_is_resumed` in Rust, `test_a_folder_copied_from_the_gpui_app_is_resumed` in Python), and were checked on the real files: three rows cleared in a copy of the Rust `bits-candidates.npy` were filled by Python with the same bytes, and the same rows cleared in that Python-resumed copy were filled by Rust, giving a file `cmp`-identical to the one before.

Differences from the Python command: it only resumes (no start over; a manifest mismatch stops it before anything is written and says to delete `precompute-cache/guess-counts/`), and the library's `openers` fills only those rows that are unfinished rather than playing them again. The threads take chunks of 8 consecutive rows; the file is synced every 10 s and at the end of each Strategy's pass; a stop drops the Openers in flight and still writes the summary.

## Cost

Measured before version 2, under the old ids: `bits-candidates` is now `bits-guesses-candidates` (whose Answer List rows are `bits-answers-candidates`), `bits-all` is `bits-guesses-all`, and the same for `expected-*`. An Answer List matrix has 2,315 rows instead of 14,855, so filling it takes about a sixth of the time.

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

Top 5 for `bits-guesses-candidates` (then `bits-candidates`) over the whole Guess List: salet 3.528 (8 Losses), slate 3.529 (7), least 3.537 (9), reast 3.539 (10), trace 3.540 (7). With `bits-guesses-all` (then `bits-all`), tarse 3.429 and salet 3.432, both with no Losses (only those two Openers filled).
