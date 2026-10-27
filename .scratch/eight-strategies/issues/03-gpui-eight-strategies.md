# 03: Eight Strategies and the version 2 Guess Count Matrix in the gpui app

**What to build:** The gpui app matches the Python package. It names all eight Strategies, builds and resumes the version 2 Guess Count Matrix folder byte for byte as Python does, and its Solver panel ranks the whole Guess Pool for the Opener.

**Blocked by:** 01

**Status:** done

- [x] `STRATEGIES` in `solver/strategy.rs` has the eight, with the spec's ids, names and paths. `Strategy::named` names every combination of **Words**, **Search** and **Rank by**, so the panel no longer has an unnamed mix
- [x] The panel's Suggestion before the first Guess ranks the whole Guess Pool under either Search Scope
- [x] `solver/guess_count_matrix.rs` writes the version 2 layout and manifest (it differs from Python's only in `tool`), and `summary.json` and the CSVs byte for byte as Python's
- [x] A version 1 folder stops the build before anything is written, and the message names `just migrate-guess-counts`
- [x] **Precompute guess counts…**: the picker lists the eight Strategies, and the precompute view's progress and log name the new ids
- [x] The Opener chart and summary in the Solver panel read the version 2 summary for the Strategy the settings name
- [x] Tests: the Python-reference tests compare all eight Strategies' rows and summaries; a folder written by Python is resumed by Rust and the other way round; `Strategy::named` covers all eight
- [x] `cargo test` passes
- [x] Docs updated: `gpui-app.md`, the Rust parts of `guess-count-matrix.md` and `npy-in-python-and-rust.md`, and the index summary of the gpui app

See [spec](../spec.md).

## Comments

- Done. `Strategy` gained a `path` field and `STRATEGIES` holds the eight (ids, names, paths and order as Python's); `Strategy::named` now returns `&'static Strategy` for every combination, so `Lookup::NoMatrix` is gone. `SearchMode::for_guess(guesses_made)` gives `Everything` before the first Guess, and the panel ranks its first Suggestion with it. `guess_count_matrix.rs` writes format version 2: `pool_words(feedback, set)` gives a Strategy's rows, files go to `strategy.path` (Ranking folders created), the manifest has `rows` per Guess Pool and each `path`, and `folder_mismatch` refuses a version 1 folder with `BuildError::Folder` before anything is written ("Can't use precompute-cache/guess-counts/: manifest.json was written by format version 1; migrate it with `just migrate-guess-counts`"). `summarize` takes the pool's words, and `write_summary` ranks each Strategy's own rows. `RunState::guess_counts` sizes each item from its Guess Pool (`MatrixSet::size`).
- Tested against a Python folder built with `guess_count_matrix.build(out, openers=["salet", "crane", "aback", "zonal"], threads=4)` (about 30 s): rows of all eight Strategies, `summary.json` and all eight CSVs byte for byte, and the new `a_folder_the_python_command_wrote_is_resumed_with_the_same_bytes` (one row of each matrix cleared, resumed by Rust: every file Python's again, the manifest but `tool`). The other way by hand: a small Rust-written folder passed Python's `mismatch`, Python's `write_summary` reproduced Rust's summary and CSVs, and rows cleared and replayed by Python gave Rust's bytes back. No byte differences turned up; nothing in Python needed changing.
- Decisions the spec left open: (1) An `openers` word outside a Strategy's Guess Pool is skipped for it, as in Python, but a word on no list is still `BuildError::UnknownOpener` (Python skips it silently). (2) The Rust `openers` still fills only unfinished rows (the existing, documented difference from Python's `--opener`). (3) Under an Answer List Strategy a Guess List word charted before the first Guess gets its own note (`Lookup::NotInPool`: "SALET isn't on the Answer List, so bits-answers-candidates has no row for it.") rather than "row isn't finished", with no button. (4) Before the first Guess the panel's note says the Opener tries the whole Guess Pool. (5) A version 1 `summary.json` (old ids) is read as it is, so it covers no Strategy until migrated. The real `precompute-cache/guess-counts/` is still version 1 (written by the gpui app), so the app refuses it until `just migrate-guess-counts` runs (ticket 05).
