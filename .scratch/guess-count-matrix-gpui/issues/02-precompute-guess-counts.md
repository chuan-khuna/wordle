# 02: Precompute guess counts… in the gpui app

**What to build:** A Rust port of the tree play and the Guess Count Matrix build, and a **Precompute guess counts…** command (menu and palette) that runs it. The picker chooses the thread count and the Strategies. The work runs in the background with progress in the status bar, can be stopped (finished rows kept), resumes rows left unfinished by either tool, and writes `precompute-cache/guess-counts/<id>.npy` and `summary.json` in the same format as `just precompute-guess-counts`.

**Blocked by:** 01; and the Guess Count Matrix spec's tickets 04 and 05 (they define the files and the resume rules)

**Status:** done

- [x] The library plays one Opener under one Strategy and returns every Answer's Guess Count (13 when unsolved)
- [x] The library build fills only zero rows, in place, on N threads, with a progress callback and a stop flag, then rewrites `summary.json`
- [x] Tests: rows equal playing each Game alone; rows equal the Python command's rows when its files are present; unasked rows stay zero; filled rows kept; 1 and N threads byte-identical; the stop flag keeps finished rows; the summary on a hand-filled matrix
- [x] The command, its picker (state tested like the Precompute matrices picker), the status bar progress and end message, and stopping a run work in the app
- [x] The gpui app and Guess Count Matrix documents describe it, with the measured time of a global Strategy

See [spec](../spec.md).

## Comments

- 2026-10-20: the byte-level format and what this writer must match (header, row/column order, zeroed rows, `manifest.json`, CSV `True`/`False`, float printing) are in [docs/documents/npy-in-python-and-rust.md](../../../docs/documents/npy-in-python-and-rust.md#contract-for-a-second-writer-of-the-guess-count-matrix).
- 2026-10-20: Done. `solver/guess_counts.rs` (`Player`: tree play with a per-thread next-Guess cache and a one-thread search that keeps the best row by `suggest`'s keys) and `solver/guess_count_matrix.rs` (`build` with threads, chunks of 8 rows, progress callback and stop flag; manifest check and write; `write_summary`, ranking CSV via `serde_json`). Bits are now summed in numpy's pairwise order (`strategy::numpy_sum`), so they match Python to the last bit; `summary.json` and the CSVs came out byte-identical to the Python command's for the same matrices (checked against a Python run of all four Strategies in a temp folder via `WORDLE_PYTHON_GUESS_COUNTS`), and the full Rust `bits-candidates` matrix equals the 6,442 rows Python had finished in `precompute-cache/`. Command **Precompute guess counts…**, picker (`overlays/guess_counts.rs`, tested), status bar progress, stop prompt and end message are wired in `ui/`. Measured (release, M1 Pro, load 15–30 from other runs): `bits-candidates` full in 11.0 s on 8 threads; `bits-all` 991 Openers in 102.5 s on 8 threads, so about 26 min for all 14,855 (extrapolated). The library's `openers` fills only unfinished rows (Python's replays them). Not checked by hand in the UI.
