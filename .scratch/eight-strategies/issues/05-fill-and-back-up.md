# 05: Migrate the real cache, play the Answer List with All words Strategies, and commit the backup

**What to build:** The real `precompute-cache/guess-counts/` is version 2 with all eight matrices finished, the Benchmark has all eight Strategies, and the backup in `data/precompute/` is updated.

**Blocked by:** 02, 03

**Status:** done

- [x] `just restore-cache` (if the local cache is missing), then `just migrate-guess-counts` on the real folder
- [x] `bits/answers-all` and `expected/answers-all` are played with the gpui app's Rust build (fast) or `just precompute-guess-counts`
- [x] The cost (time, threads, machine) is recorded under Cost in `guess-count-matrix.md`
- [x] `just precompute-benchmark` is rerun, so the Benchmark has eight Strategies
- [x] `summary.json` has eight Strategies, each with every row complete
- [x] The Results section of `guess-count-matrix.md` gives the top 5 of each Strategy, and says how `answers-all` compares with `guesses-all`
- [x] `just backup-cache` is rerun, and the version 2 `data/precompute/guess-counts/` replaces the version 1 files in a commit

See [spec](../spec.md).

## Comments

- Done. Safety copy of the version 1 folder kept outside the repo before anything ran. `just migrate-guess-counts --yes` took 2.4 s; checked with numpy that every `guesses-*` matrix is byte-identical to its version 1 source and each `answers-candidates` is exactly its Answer List rows. The two `answers-all` matrices were played by the gpui app's Rust build through the ignored `measure_a_build` test pointed at the real folder (`GUESS_COUNTS_OUT=<repo>/precompute-cache/guess-counts GUESS_COUNTS_STRATEGY=<id> cargo test --release -- --ignored --nocapture measure_a_build`, 8 threads, Apple M1 Pro): `bits-answers-all` 14.7 s, `expected-answers-all` 9.4 s; no new CLI. The manifest now says `tool` rust (the last writer).
- Checked: Python's `folder_mismatch` and `mismatch` accept all eight; no zero or 13 cell in any matrix; Python's `write_summary` on a copy reproduces the Rust `summary.json` and all eight CSVs byte for byte; Python replaying `slate` and `zonal` in both `answers-all` matrices gives the same bytes. `just precompute-benchmark --threads 8 --yes` took 12.4 s (`openers.json` unchanged); Article 09's numbers agree with it. `summary.json`: eight Strategies, `complete_rows` 2,315 or 14,855 each.
- Backup: `just backup-cache --folder guess-counts --folder benchmark --yes` (4.8 min); it removes the old folder first, so the flat version 1 `.xz` files are gone. `data/precompute/` grows from 24.6 MB to 29.1 MB (`guess-counts/` 29.08 MB, and `benchmark/` is backed up for the first time, about 12 KB). Every `.xz` decompresses to its cache file byte for byte. `uv run pytest` (root, 115) and the backend tests (46) pass; `/api/guess-counts?strategy=bits-answers-all` returns 2,315 complete rows.
