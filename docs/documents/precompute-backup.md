# Precompute backup

`precompute-cache/` is gitignored: it is where every tool reads and writes its precomputed files, and some of them are rewritten in place while a run goes. The Guess Count Matrices take about half an hour to build in the gpui app (and many hours in Python), so a compressed copy of them is committed in `data/precompute/`. `src/precompute_backup.py` makes and restores it.

## Commands

| Command | What it does |
| --- | --- |
| `just backup-cache` | compresses each folder of `precompute-cache/` except `feedback/` into `data/precompute/<folder>/`, one `<file>.xz` per file, after removing that folder's old backup |
| `just restore-cache` | decompresses each folder of `data/precompute/` into `precompute-cache/<folder>/`, after removing what was there |

Both take `--folder NAME` (repeatable, e.g. `--folder guess-counts`) and `--yes` (replace without asking). `backup` also takes `--partial`.

## What is backed up

- **Every folder but `feedback/`.** The Feedback matrices rebuild in about a second (`just precompute`, or the gpui app's **Precompute matrices…**), so committing them would only add about 15 MB to the history. Today that leaves `guess-counts/` (and `benchmark/` once `just backend-precompute` has written it).
- **Every file in the folder**, including `summary.json`, the ranking CSVs and `manifest.json`, so a restored folder is ready to read and to resume.
- **Only finished Guess Count Matrices.** When a folder has a `summary.json` and a `manifest.json`, `backup` compares each Strategy's `complete_rows` with the number of Openers in the manifest and stops if any is short, listing them. `--partial` backs it up anyway. Committing only finished matrices keeps the history from growing on every run.

## Size and format

Each file is compressed on its own with Python's `lzma` at xz's default preset 6, so one file can be restored or replaced without the rest, and the same input gives the same bytes (git sees no change when nothing changed). The four 34.4 MB Guess Count Matrices shrink to 5.0 to 6.2 MB each, and the whole folder from about 151 MB to about 24.5 MB; preset 9 saved only about 3%. A backup takes about two minutes. The xz format carries a CRC of each file, so a damaged backup fails to decompress.

## Restoring

`restore` replaces the whole folder, so a half-built run there is dropped rather than mixed with the restored manifest. After a restore, build the Feedback matrices if they are missing; the Guess Count Matrices only need them to resume or extend a run, not to show results.
