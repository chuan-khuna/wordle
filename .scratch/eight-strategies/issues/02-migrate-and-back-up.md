# 02: Migrate a version 1 Guess Count Matrix folder, and back up the nested layout

**What to build:** A command that turns a version 1 `guess-counts/` folder into the version 2 layout without playing anything again, and a backup and restore that handle the `bits/` and `expected/` subfolders.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `just migrate-guess-counts` (in `src/`, with the other entry points) reads a version 1 folder and writes version 2:
  - each `<ranking>-candidates.npy` becomes `<ranking>/guesses-candidates.npy`, and its Answer List rows are copied to `<ranking>/answers-candidates.npy`
  - each `<ranking>-all.npy` becomes `<ranking>/guesses-all.npy`
  - then it writes the version 2 manifest, `summary.json` and the ranking CSVs
- [ ] The migration keeps unfinished (zero) rows as they are, so a partial version 1 matrix stays resumable
- [ ] It refuses a folder that is already version 2 or whose word lists don't match, and asks before overwriting. `--yes` skips the question
- [ ] It removes the version 1 files only after the version 2 files are written
- [ ] `src/precompute_backup.py` backs up and restores files in subfolders (`data/precompute/guess-counts/bits/<file>.xz`, …), and its unfinished-matrix check reads the version 2 manifest
- [ ] The backup has a version 1 fallback: `just restore-cache` of an old backup, then the migration, gives the version 2 folder
- [ ] Tests: migrating a small version 1 folder gives byte-identical rows; an `answers-candidates` slice is right; a partial matrix stays partial; backup and restore with subfolders round-trips
- [ ] `uv run pytest` passes
- [ ] Docs updated: `guess-count-matrix.md` (migration), `precompute-backup.md` (subfolders), and the index if a summary changes

See [spec](../spec.md).

## Comments
