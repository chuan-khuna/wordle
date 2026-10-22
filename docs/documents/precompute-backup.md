# Precompute backup

`precompute-cache/` is gitignored: it is where every tool reads and writes its precomputed files, and some of them are rewritten in place while a run goes. The Guess Count Matrices take about half an hour to build in the gpui app (and many hours in Python), so a compressed copy of them is committed in `data/precompute/`. `src/precompute_backup.py` makes and restores it.

## Commands

| Command | What it does |
| --- | --- |
| `just cache backup` | compresses each folder of `precompute-cache/` except `feedback/` into `data/precompute/<folder>/`, one `<file>.xz` per file with subfolders kept (`data/precompute/guess-counts/bits/<file>.xz`), after removing that folder's old backup |
| `just cache restore` | decompresses each folder of `data/precompute/` into `precompute-cache/<folder>/`, subfolders included, after removing what was there |

Both take `--folder NAME` (repeatable, e.g. `--folder guess-counts`) and `--yes` (replace without asking). `backup` also takes `--partial`.

## What is backed up

- **Every folder but `feedback/`.** The Feedback matrices rebuild in about a second (`just precompute feedback`, or the gpui app's **Precompute matrices…**), so committing them would only add about 15 MB to the history. Today that leaves `guess-counts/` and `benchmark/` (`benchmark.json` and `openers.json`, about 12 KB packed).
- **Every file in the folder and its subfolders**, including `summary.json`, `manifest.json` and the `bits/` and `expected/` folders of a version 2 Guess Count Matrix folder (matrices and ranking CSVs), so a restored folder is ready to read and to resume.
- **Only finished Guess Count Matrices.** When a folder has a `summary.json` and a `manifest.json`, `backup` compares each Strategy's `complete_rows` with the number of Openers in the manifest and stops if any is short, listing them. In a version 2 manifest that is the length of `rows[<pool>]` for the Strategy's `pool` (2,315 or 14,855); a version 1 manifest's `rows` is one list, used for every Strategy. `--partial` backs it up anyway. Committing only finished matrices keeps the history from growing on every run.

## Size and format

Each file is compressed on its own with Python's `lzma` at xz's default preset 6, so one file can be restored or replaced without the rest, and the same input gives the same bytes (git sees no change when nothing changed). Measured on the version 1 layout: the four 34.4 MB Guess Count Matrices shrink to 5.0 to 6.2 MB each, and the whole folder from about 151 MB to about 24.5 MB; preset 9 saved only about 3%. On the version 2 layout (all eight matrices finished) the folder shrinks from about 175 MB to about 29.1 MB: the four Guess List matrices 5.0 to 6.2 MB each as before, the four Answer List ones 0.9 to 1.1 MB, and `summary.json` (11.1 MB, now with eight rankings) 1.1 MB. A backup took about two minutes on the version 1 layout and 4.8 minutes on version 2 (with other work loading the machine). The xz format carries a CRC of each file, so a damaged backup fails to decompress.

## Restoring

A version 1 backup (flat `guess-counts/<old id>.npy.xz` files) restores as it was. Run `just precompute migrate` after it to get the version 2 folder (see [Guess Count Matrix](guess-count-matrix.md#migrating-a-version-1-folder)), then `just cache backup` to replace the backup with the version 2 one.


`restore` replaces the whole folder, so a half-built run there is dropped rather than mixed with the restored manifest. After a restore, build the Feedback matrices if they are missing; the Guess Count Matrices only need them to resume or extend a run, not to show results.

## Tests

`tests/test_precompute_backup.py` (run by `uv run pytest` at the root) loads the script with its folders moved into a temporary folder and checks that a backup and restore of a version 2 folder with `bits/` and `expected/` round-trips byte for byte (and leaves `feedback/` out), that an unfinished version 2 matrix needs `--partial`, and that a version 1 backup restores and then migrates to version 2.
