# 03: Eight Strategies and the version 2 Guess Count Matrix in the gpui app

**What to build:** The gpui app matches the Python package. It names all eight Strategies, builds and resumes the version 2 Guess Count Matrix folder byte for byte as Python does, and its Solver panel ranks the whole Guess Pool for the Opener.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `STRATEGIES` in `solver/strategy.rs` has the eight, with the spec's ids, names and paths. `Strategy::named` names every combination of **Words**, **Search** and **Rank by**, so the panel no longer has an unnamed mix
- [ ] The panel's Suggestion before the first Guess ranks the whole Guess Pool under either Search Scope
- [ ] `solver/guess_count_matrix.rs` writes the version 2 layout and manifest (it differs from Python's only in `tool`), and `summary.json` and the CSVs byte for byte as Python's
- [ ] A version 1 folder stops the build before anything is written, and the message names `just migrate-guess-counts`
- [ ] **Precompute guess counts…**: the picker lists the eight Strategies, and the precompute view's progress and log name the new ids
- [ ] The Opener chart and summary in the Solver panel read the version 2 summary for the Strategy the settings name
- [ ] Tests: the Python-reference tests compare all eight Strategies' rows and summaries; a folder written by Python is resumed by Rust and the other way round; `Strategy::named` covers all eight
- [ ] `cargo test` passes
- [ ] Docs updated: `gpui-app.md`, the Rust parts of `guess-count-matrix.md` and `npy-in-python-and-rust.md`, and the index summary of the gpui app

See [spec](../spec.md).

## Comments
