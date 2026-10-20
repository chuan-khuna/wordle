# RFC 01: File format of the Guess Count Matrix

Status: proposed (2026-10-20)

Ticket 04 stores each Guess Count Matrix as a `.npy` file. Before resume (ticket 05) and the gpui writer (gpui ticket 02) build on that, this RFC checks whether `.npy` is the right choice.

## Who reads and writes it

| Who | Reads | Writes | Needs |
|---|---|---|---|
| Python command (`just precompute-guess-counts`) | the matrix | rows in place, from several threads | resume from unfinished rows |
| gpui app (Precompute guess counts…) | the matrix (to resume) | rows in place, from several threads | no heavy dependencies; the crate writes `.npy` by hand today |
| gpui Solver panel | `summary.json` only | none | nothing |
| Website / static build | `summary.json` only (ticket 08) | none | small download |
| Notebooks, research | the matrix | none | easy loading into numpy or pandas |

Only the two precompute tools and research ever touch the full matrix. The apps and the website read only the summary.

## What we measured

On the real `bits-candidates` matrix (14,855 × 2,315, every row filled):

| | Size | Time |
|---|---|---|
| `.npy`, `uint8`, as today | 34.4 MB per Strategy (137.6 MB for four) | none |
| 4 bits per cell (values 1 to 13 fit) | 17.2 MB | none |
| gzip -6 (also what `.npz` compressed gives) | 9.2 MB | 5 s |
| zstd -3 | 9.4 MB | 0.1 s |
| zstd -19 | 6.4 MB | 31 s |
| xz -6 | 6.1 MB | 60 s |

- The values run from 1 to 10, mostly 3 and 4. The entropy is 1.72 bits per cell, so about 5 MB is the floor for any compressor that ignores order.
- `summary.json` is 3.8 MB indented (2.4 MB compact) for two Strategies. With four Strategies it will be about 7.5 MB indented.

## Requirements

1. Python reads it as a numpy array with no new dependency.
2. Rust writes it with no new dependency, or only a light one.
3. Rows can be written in place, one at a time, from several threads, so that resume works and a stop loses at most the rows in flight.
4. An unfinished row can be told apart from a finished one, even after a crash.
5. The file says what it holds: its Strategy, the word lists and their order, and the safety limit. A matrix built from other word lists must never be resumed or read as if it were current.
6. Size on disk matters a little, because the folder is gitignored and local. It would matter a lot only if the matrix were shipped, which nothing does.

## Options

### A. `.npy` plus a manifest (proposed)

Keep `<id>.npy` as it is, and add `guess-counts/manifest.json` holding the format version, the shape and dtype, the row order (the sorted Guess List) and column order (the Answer List), a SHA-256 of each word list, each Strategy's definition (pool, scope, ranked by), the safety limit, and which tool wrote it.

- ✅ 1, 2, 3: `np.load(mmap_mode="r")` and `open_memmap` already work, and the gpui crate already writes the `.npy` header.
- ✅ 4: rows start at zero and no Guess Count is 0. One gap: rewriting an already finished row (as `--opener` does) could leave a mix of old and new values if a crash comes mid-row, and every cell would be non-zero. The fix is to zero the row first and then write it.
- ✅ 5, through the manifest. Writers refuse to resume when the word-list hashes don't match, and say to start over.
- ❌ 6: 34 MB per Strategy, which is fine for a local cache.

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

### F. Parquet (one row per Opener)

- ✅ Very good for pandas, polars and DuckDB, and compressed.
- ❌ Files can't be changed, so resume needs one file per chunk of Openers. Rust needs the `arrow`/`parquet` crates, which are heavy.

## Proposal

**Option A.** Keep `.npy`, and add:

1. **`guess-counts/manifest.json`**, written with the matrices and checked before any resume. If the word-list hashes or a Strategy's definition don't match, the command refuses to resume and says to start over with `--fresh`.
2. **Zero, then write** when a finished row is played again.
3. **Compact `summary.json`** (no indent). It drops from 7.5 MB to about 4.8 MB with four Strategies, and the website can gzip it when serving.
4. **No export command for now.** If a matrix ever has to be shared, zstd -3 makes it 9.4 MB in 0.1 s. Add `just export-guess-counts` then.

Out of scope here, but the same gap exists: the Feedback Matrices have no manifest either, so a change to the word lists would leave a stale `precompute-cache/feedback/` without any warning. The same manifest could cover them, as its own ticket.

## Questions for the decision

1. Option A as proposed, or another option?
2. Does `manifest.json` cover the Feedback Matrices too, now or later?
3. Should the manifest go in `summary.json` instead, as one file rather than two? It is kept separate in this proposal so that a reader of the matrix doesn't have to load 5 MB of summary to check the word lists.

Once decided, this becomes an ADR in `docs/adr/`. The format is hard to change once both tools write it, and a reader would wonder why it isn't compressed.
