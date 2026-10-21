# 02: Migrate a version 1 Guess Count Matrix folder, and back up the nested layout

**What to build:** A command that turns a version 1 `guess-counts/` folder into the version 2 layout without playing anything again, and a backup and restore that handle the `bits/` and `expected/` subfolders.

**Blocked by:** 01

**Status:** done

- [x] `just migrate-guess-counts` (in `src/`, with the other entry points) reads a version 1 folder and writes version 2:
  - each `<ranking>-candidates.npy` becomes `<ranking>/guesses-candidates.npy`, and its Answer List rows are copied to `<ranking>/answers-candidates.npy`
  - each `<ranking>-all.npy` becomes `<ranking>/guesses-all.npy`
  - then it writes the version 2 manifest, `summary.json` and the ranking CSVs
- [x] The migration keeps unfinished (zero) rows as they are, so a partial version 1 matrix stays resumable
- [x] It refuses a folder that is already version 2 or whose word lists don't match, and asks before overwriting. `--yes` skips the question
- [x] It removes the version 1 files only after the version 2 files are written
- [x] `src/precompute_backup.py` backs up and restores files in subfolders (`data/precompute/guess-counts/bits/<file>.xz`, …), and its unfinished-matrix check reads the version 2 manifest
- [x] The backup has a version 1 fallback: `just restore-cache` of an old backup, then the migration, gives the version 2 folder
- [x] Tests: migrating a small version 1 folder gives byte-identical rows; an `answers-candidates` slice is right; a partial matrix stays partial; backup and restore with subfolders round-trips
- [x] `uv run pytest` passes
- [x] Docs updated: `guess-count-matrix.md` (migration), `precompute-backup.md` (subfolders), and the index if a summary changes

See [spec](../spec.md).

## Comments

- Done. The migration is `wordle/solver/guess_count_migration.py` (`plan(out, solver)` checks and lists the version 1 matrices, raising `MigrationRefused`; `migrate(out, solver)` writes each new matrix through a temporary file, then the version 2 manifest via `_write_manifest`, then `write_summary`, then removes `<old id>.npy` and `<old id>.ranking.csv`). The command is `cli.migrate_guess_counts` behind `src/migrate_guess_counts.py` and `just migrate-guess-counts` (`--out DIR`, `--yes`). `src/precompute_backup.py` walks subfolders on backup and restore, and `unfinished` counts a Strategy's rows from `rows[<pool>]` (falling back to the one list of a version 1 manifest).
- Decisions the ticket left open: (1) "asks before overwriting" is one confirm before every migration (it always replaces `manifest.json` and `summary.json` in place), listing which file becomes which; default no. (2) Besides an already version 2 folder and other word lists, it refuses a missing manifest, another safety limit, a version 1 matrix without its version 1 manifest entry or with the wrong shape or dtype, and a folder with no version 1 matrix. (3) Only the version 1 matrices on disk are migrated, and the new manifest lists only the Strategies migrated (the version 1 entries are dropped). (4) Tests of `src/` scripts now live in a root `tests/` folder (added to `testpaths`), loading the script by path; there were none before.
