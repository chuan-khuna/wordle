# 01: Eight Strategies and the version 2 Guess Count Matrix in Python

**What to build:** The `wordle` package names all eight Strategies (Guess Pool × Search Scope × Ranking) with the spec's ids and display names, and the Guess Count Matrix build writes the version 2 layout: `bits/` and `expected/` folders, `<pool>-<scope>.npy` files whose rows are the Strategy's Guess Pool, and a version 2 manifest. Wherever the Solver picks an Opener itself, it ranks the whole Guess Pool.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `STRATEGIES` in `solver/strategy.py` has the eight Strategies, in the spec's order, each with a `path` (or a function that gives it)
- [x] `benchmark.best_opener` ranks the whole Guess Pool (`scope="global"`) for every Strategy
- [x] `guess_count_matrix.build` creates each matrix at `len(pool) × 2,315`, with rows in sorted Guess Pool order, under `<ranking>/`
- [x] `manifest.json` is `format_version: 2`: `rows` maps each Guess Pool to its words, and each Strategy entry has its `path`
- [x] `mismatch` reports a version 1 manifest as a reason ("written by format version 1; migrate it with …"), and resuming still fills only zero rows
- [x] `summary.json` and `<ranking>/<pool>-<scope>.ranking.csv` are written per Strategy from its own rows
- [x] `just precompute-guess-counts`: the Strategy question lists the eight, `--strategy` takes the new ids, and the printout lists the files in both folders
- [x] `just precompute-benchmark` writes eight Benchmarks
- [x] Tests: the eight Strategies; an Answers matrix has 2,315 rows; `*-answers-candidates` rows equal the Answer List rows of `*-guesses-candidates`; a version 1 folder is a mismatch; resume, threads and Ctrl+C still work with the nested layout
- [x] `uv run pytest` passes in `packages/wordle/`
- [x] Docs updated: `solver-strategy.md`, `guess-count-matrix.md` (files, manifest, summary, the command), the contract in `npy-in-python-and-rust.md` (version 2), a version 2 note in ADR 0001, and the index summaries that name the four Strategies

See [spec](../spec.md).

## Comments

- Done. `Strategy` gained a `path` property (`<ranking>/<pool>-<scope>.npy`) and `Solver.pool_words(pool)` gives a Guess Pool's sorted words (the rows of its matrix). `STRATEGIES` holds the eight; `best_opener` ranks with `scope="global"`. `guess_count_matrix` writes format version 2 (nested files, `rows` per Guess Pool, `path` per Strategy) and has a new `folder_mismatch(out)`; the command refuses a version 1 folder before any question and lists files recursively.
- Decisions the spec left open: (1) `build` refuses a version 1 folder without `fresh` even for a Strategy with no rows yet, so the version 1 manifest is never overwritten before ticket 02 migrates it; `--fresh` writes version 2 beside the old flat files (left in place). (2) An `--opener` word not in a Strategy's Guess Pool is skipped for that Strategy (so `--opener salet` fills only the Guess List matrices), not an error. (3) `summary.json` entries are unchanged (`{id, name, complete_rows, openers}`, no `path`).
- Breaks outside the package until tickets 02 to 04: the web backend (`routers/guess_counts.py` defaults to `bits-all`; its tests use the old ids), `src/precompute_backup.py` (reads `manifest["rows"]` as a list), and the gpui app, which still writes version 1 and so its folder is refused by the Python command until migrated. `web-backend.md` and `gpui-app.md` still describe the old ids; they move with their tickets.
