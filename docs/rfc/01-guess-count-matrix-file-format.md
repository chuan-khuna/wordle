# RFC 01: File format of the Guess Count Matrix

Status: accepted (2026-10-20), see [ADR 0001](../adr/0001-guess-count-matrix-file-format.md) and the Decision section at the end

Ticket 04 stores each Guess Count Matrix as a `.npy` file. Before resume (ticket 05) and the gpui writer (gpui ticket 02) build on that, this RFC checks whether `.npy` is the right choice, and whether a human-readable format (CSV) or an analytics format (Parquet) would serve better.

## Who reads and writes it

| Who | Reads | Writes | Needs |
|---|---|---|---|
| Python command (`just precompute-guess-counts`) | the matrix | rows in place, from several threads | resume from unfinished rows |
| gpui app (Precompute guess counts…) | the matrix (to resume) | rows in place, from several threads | no heavy dependencies; the crate writes `.npy` by hand today |
| gpui Solver panel | `summary.json` only | none | nothing |
| Website / static build | `summary.json` only (ticket 08) | none | small download |
| Notebooks, research | the matrix | none | easy loading into numpy, pandas, polars or DuckDB |
| A person checking results | a ranking, or one Opener's row | none | opens in a text editor or spreadsheet, with words instead of indices |

Only the two precompute tools and research ever touch the full matrix. The apps and the website read only the summary. A person almost never wants all 34 million cells: they want the ranking, or "how does salet do on each Answer?".

## What we measured

On the real `bits-candidates` matrix (14,855 × 2,315, every row filled):

| | Size | Write | Read into numpy |
|---|---|---|---|
| `.npy`, `uint8`, as today | 34.4 MB per Strategy (137.6 MB for four) | none | instant (mmap) |
| 4 bits per cell (values 1 to 13 fit) | 17.2 MB | none | |
| gzip -6 (also what `.npz` compressed gives) | 9.2 MB | 5 s | |
| zstd -3 | 9.4 MB | 0.1 s | |
| zstd -19 | 6.4 MB | 31 s | |
| xz -6 | 6.1 MB | 60 s | |
| CSV, wide (one line per Opener, one column per Answer) | 68.9 MB | 1.9 s | 0.3 s (`np.loadtxt`) |
| CSV, wide, gzip -6 | 11.1 MB | 4.7 s | |
| CSV, long (`opener,answer,guess_count`, one line per cell) | about 481 MB (estimated) | | |
| Parquet, wide, zstd | 8.7 MB | 0.5 s | 0.7 s |
| Parquet, wide, snappy | 12.8 MB | 0.5 s | fast |
| Parquet, long, zstd, words dictionary-encoded | 8.9 MB | 2.2 s | |

- The values run from 1 to 10, mostly 3 and 4. The entropy is 1.72 bits per cell, so about 5 MB is the floor for any compressor that ignores order.
- `summary.json` is 3.8 MB indented (2.4 MB compact) for two Strategies. With four Strategies it will be about 7.5 MB indented.
- Parquet was measured with `pyarrow` 22 run through `uv run --with`, not added to the project.

## Requirements

1. Python reads it as a numpy array with no new dependency.
2. Rust writes it with no new dependency, or only a light one.
3. Rows can be written in place, one at a time, from several threads, so that resume works and a stop loses at most the rows in flight.
4. An unfinished row can be told apart from a finished one, even after a crash.
5. The file says what it holds: its Strategy, the word lists and their order, and the safety limit. A matrix built from other word lists must never be resumed or read as if it were current.
6. Size on disk matters a little, because the folder is gitignored and local. It would matter a lot only if the matrix were shipped, which nothing does.
7. A person can check the results without writing code: the ranking, and one Opener's Guess Counts by Answer, with words rather than row and column numbers.

## Options

### A. `.npy` plus a manifest (proposed)

Keep `<id>.npy` as it is, and add `guess-counts/manifest.json` holding the format version, the shape and dtype, the row order (the sorted Guess List) and column order (the Answer List), a SHA-256 of each word list, each Strategy's definition (pool, scope, ranked by), the safety limit, and which tool wrote it.

- ✅ 1, 2, 3: `np.load(mmap_mode="r")` and `open_memmap` already work, and the gpui crate already writes the `.npy` header.
- ✅ 4: rows start at zero and no Guess Count is 0. One gap: rewriting an already finished row (as `--opener` does) could leave a mix of old and new values if a crash comes mid-row, and every cell would be non-zero. The fix is to zero the row first and then write it.
- ✅ 5, through the manifest. Writers refuse to resume when the word-list hashes don't match, and say to start over.
- ❌ 6: 34 MB per Strategy, which is fine for a local cache.
- ❌ 7 on its own: a `.npy` is binary, and its rows and columns are indices. The manifest (JSON) is readable, and `summary.json` holds the ranking, but neither opens well in a spreadsheet. See the readable layer below.

### B. `.npz` (compressed)

- ✅ 9.2 MB, and numpy reads it.
- ❌ 3: a zip member can't be changed in place. Each save rewrites and recompresses the whole file (5 s), and threads have to go through one writer. Resume gets much harder.
- ❌ 2: Rust would need a zip and deflate crate.

### C. Raw `.bin` plus a manifest

The same as A without the 128-byte header.

- ✅ A browser can read it with no parsing.
- ❌ `np.load` stops working (you'd need `np.memmap` with a shape from the manifest), and nothing reads it in the browser anyway. No gain over A.

### D. Chunked and compressed (Zarr v3 with zstd, or our own blocks of rows)

- ✅ About 9 MB, chunks can be rewritten, the metadata is built in, and a browser could fetch one chunk at a time (`zarrita.js`).
- ❌ New dependencies: `zarr` in Python and `zarrs` in Rust, a large crate. More moving parts in exchange for a feature (shipping the matrix) that nothing needs.

### E. SQLite (one row per Strategy and Opener, the Guess Counts as a 2,315-byte blob)

- ✅ Crash-safe transactions, and resume becomes "the row exists". The metadata goes in a table, and all four Strategies fit in one file. Python's standard library has it.
- ❌ Rust needs `rusqlite`, which bundles C SQLite and adds build time. Loading the whole matrix into numpy means reading 14,855 blobs (slower, but still seconds). About 140 MB unless each blob is compressed, and compressing them loses the simple read.
- ❌ 7: a blob is no more readable than a `.npy` row. Storing one SQL row per cell instead would be readable in any SQLite browser, but is 34 million rows per Strategy.

### F. CSV as the store

Wide layout: a header line of Answers, then one line per Opener (`salet,4,3,5,…`).

- ✅ 7, partly: any text editor shows it, the words are in the file, and `np.loadtxt` reads it in 0.3 s. Excel and LibreOffice open it (2,316 columns and 14,856 rows are under their 16,384 and 1,048,576 limits).
- ❌ Too big to be readable in practice: 69 MB per Strategy, each line 4,600 characters wide. Numbers caps a table at 1,000 columns and Google Sheets at 10 million cells, so neither opens it. Nobody scrolls 2,315 columns; they filter to one row, which needs a tool anyway.
- ❌ 3 and 4: lines vary in width (`4` vs `10`), so a row can't be rewritten in place. Padding every cell to two digits (`04,`) fixes that at 104 MB, and `00` would mark an unfinished cell, but then the file is a fixed-width binary format in disguise, and every writer must keep the padding exact.
- ❌ 5: CSV has no place for metadata, so the manifest is still needed.
- ❌ 1: reading works, but `np.load(mmap_mode="r")` and its instant open are lost.
- The long layout (`opener,answer,guess_count`) is the friendliest for pandas and SQL, but about 481 MB per Strategy.

### G. Parquet as the store

Wide (one column per Answer) or long (`opener`, `answer`, `guess_count`, the words dictionary-encoded).

- ✅ 8.7 MB with zstd, read in 0.7 s, column types and the word lists inside the file, and file-level metadata for the manifest. pandas, polars and DuckDB read it directly (`SELECT * FROM 'bits-candidates.parquet' WHERE opener = 'salet'`).
- ❌ 3: a Parquet file can't be changed. Resume needs one file per chunk of Openers and a merge at the end, and threads go through one writer per chunk.
- ❌ 1: Python needs `pyarrow` (about 33 MB) or `polars`.
- ❌ 2: Rust needs the `arrow` and `parquet` crates, which are heavy.
- ❌ 7: binary, so it is no more readable by a person than `.npy` without a tool. It is readable by *tools*, which is a research need, not a storage one.

## The readable layer

CSV and Parquet both lose as the store, because the store's job is to be written in place by two tools in the middle of a long run. What a person or a notebook needs can be written from the finished `.npy` in under a second, so it belongs next to the store, not instead of it:

| File | For | Size | Written |
|---|---|---|---|
| `manifest.json` | tools and people: what the matrices hold | small | with the matrices, before any row |
| `summary.json` | the apps and the website | about 4.8 MB compact, four Strategies | at the end of every run, as today |
| `<id>.ranking.csv` | people: `rank,opener,average_guess_count,losses,won_in_1,…,won_in_6,bits,is_answer` | about 1 MB per Strategy | at the end of every run, with `summary.json` |
| `<id>.parquet` (wide or long) | research in pandas, polars or DuckDB | about 9 MB per Strategy | only by `just export-guess-counts`, if `pyarrow` is added then |

The ranking CSV holds the same numbers as `summary.json` and opens in every spreadsheet (14,855 rows, 13 columns). One Opener's row by Answer stays a one-liner in a notebook, or a small `just guess-counts salet` command if wanted.

## Proposal

**Option A**, plus the readable layer. Keep `.npy` as the store, and add:

1. **`guess-counts/manifest.json`**, written with the matrices and checked before any resume. If the word-list hashes or a Strategy's definition don't match, the command refuses to resume and says to start over with `--fresh`.
2. **Zero, then write** when a finished row is played again.
3. **Compact `summary.json`** (no indent). It drops from 7.5 MB to about 4.8 MB with four Strategies, and the website can gzip it when serving.
4. **`<id>.ranking.csv`** next to `summary.json`, written by the same function from the same data, using only the standard library's `csv`. The gpui writer only needs to write it if the gpui app ever writes the summary.
5. **No Parquet or full-matrix CSV for now.** If research needs one, add `just export-guess-counts --format parquet|csv` then, with `pyarrow` in a dependency group rather than the package. If a matrix ever has to be shared, zstd -3 makes it 9.4 MB in 0.1 s.

Out of scope here, but the same gap exists: the Feedback Matrices have no manifest either, so a change to the word lists would leave a stale `precompute-cache/feedback/` without any warning. The same manifest could cover them, as its own ticket.

## Questions for the decision

1. Option A as proposed, or another option?
2. Is the ranking CSV enough for people, or is a per-Opener view (a CSV of one row by Answer, or a command) wanted too?
3. Does `manifest.json` cover the Feedback Matrices too, now or later?
4. Should the manifest go in `summary.json` instead, as one file rather than two? It is kept separate in this proposal so that a reader of the matrix doesn't have to load 5 MB of summary to check the word lists.

Once decided, this becomes an ADR in `docs/adr/`. The format is hard to change once both tools write it, and a reader would wonder why it isn't compressed, or why it isn't CSV.

## Decision

1. Option A plus the readable layer, as proposed, with one change: `manifest.json` holds the word lists themselves (`rows`, the sorted Guess List, and `columns`, the Answer List), not only their hashes. That is about 100 KB, it lets any reader map rows and columns to words without the package, and a resume compares the lists directly.
2. The ranking CSV is enough for now; one Opener's row stays a notebook one-liner.
3. The Feedback Matrices get a manifest later, as their own ticket.
4. The manifest stays a separate file.
