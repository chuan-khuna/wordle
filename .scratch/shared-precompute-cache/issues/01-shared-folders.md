# 01: The gpui app uses `feedback/` and `guess-counts/`

**What to build:** The gpui app reads and writes the Feedback Matrices in `precompute-cache/feedback/` and the Guess Count Matrices in `precompute-cache/guess-counts/`, the same folders as the Python package and the backend. The existing `*-rust/` folders on disk are moved, not rebuilt.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `solver/matrix.rs`, `solver/guess_count_matrix.rs` and the precompute view's folder names point at the shared folders
- [x] Status and log messages, comments and tests no longer name `feedback-rust/` or `guess-counts-rust/`
- [x] The Python-reference test reads Python's folder only when its manifest says Python wrote it (or `WORDLE_PYTHON_GUESS_COUNTS`)
- [x] `cargo test` and `uv run pytest` pass
- [x] The gpui app, Feedback matrices, Guess Count Matrix and `.npy` documents (and the index, if a summary changes) give the shared folders

See [spec](../spec.md).

## Comments

Done. `guess_count_matrix::PYTHON_SUBDIR` and `python_dir()` are gone; the Python-reference tests read `default_dir()` and still skip unless its manifest's `tool` ends in `(python)` (or `WORDLE_PYTHON_GUESS_COUNTS` is set). The local `precompute-cache/feedback-rust/` and `guess-counts-rust/` were renamed to `feedback/` and `guess-counts/` (no Python copies existed).
