# 0001: The Guess Count Matrix is stored as uncompressed `.npy`, with a manifest and a readable layer

Status: accepted (2026-10-20)

## Context

Each Guess Count Matrix is 14,855 × 2,315 Guess Counts (34.4 MB as `uint8`). Two tools write it, the Python command and the gpui app, row by row from several threads over runs of hours, and must resume from unfinished rows. Only those tools and research read the whole matrix; the apps and the website read a summary. The values compress well (1.72 bits per cell; zstd gives 9.4 MB, Parquet 8.7 MB), and a CSV would be readable by people. [RFC 01](../rfc/01-guess-count-matrix-file-format.md) compares the options with measurements.

## Decision

Keep one uncompressed `.npy` per Strategy as the store, because it is the only option that numpy and the Rust crate both read and write in place with no new dependency. Rows start at zero (no Guess Count is 0), so a zero cell marks an unfinished row; a finished row played again is zeroed before it is rewritten. Beside the matrices, `manifest.json` records the format version, the word lists themselves (row and column order) and each Strategy's definition, and a run refuses to resume a matrix whose manifest does not match. For people and tools, every run also writes a compact `summary.json` and one `<id>.ranking.csv` per Strategy; Parquet or a full-matrix CSV can be exported later if research needs it.

## Consequences

- 137.6 MB on disk for four Strategies, in a gitignored local folder.
- Rows and columns are indices; anything that maps them to words reads the manifest.
- Changing the word lists makes old matrices unresumable by design; `--fresh` rebuilds them.
- The Feedback Matrices still have no manifest; that is a separate change.

## Note: format version 2 (2026-10-21)

With eight Strategies (Guess Pool × Search Scope × Ranking, see [the spec](../../.scratch/eight-strategies/spec.md)) the decision still holds: one uncompressed `.npy` per Strategy, a manifest and the readable layer. What changes is the layout. Files sit in one folder per Ranking, `<ranking>/<pool>-<scope>.npy`, and a matrix's rows are its Strategy's Guess Pool, so an Answer List matrix is 2,315 × 2,315 (5.4 MB) and a Guess List one stays 14,855 × 2,315. The manifest is `format_version: 2`: `rows` maps each Guess Pool to its sorted words and each Strategy entry gives its `path`. A version 1 folder is a mismatch, migrated with `just migrate-guess-counts` rather than played again. On disk the eight Strategies take 4 × 34.4 + 4 × 5.4 ≈ 159 MB.
