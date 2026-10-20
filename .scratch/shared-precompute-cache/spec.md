# One precompute cache for Python and Rust, backed up in git

Status: done

Builds on [the precompute-cache move](../guess-count-matrix/issues/01-precompute-cache.md), which put every precomputed file under one gitignored `precompute-cache/`.

## Problem Statement

The gpui app writes its own copies of the precomputed files, `precompute-cache/feedback-rust/` and `precompute-cache/guess-counts-rust/`, beside the Python package's and the backend's `feedback/` and `guess-counts/`. The files are byte-identical (the manifest's `tool` aside), so the split only costs: the Guess Count Matrices the Rust app builds in about half an hour are invisible to Python and the backend, whose own build of the global Strategies takes an estimated 9 to 35 hours, and there are two folders of each to keep, document and back up.

The cache is also gitignored and nothing keeps it. The Feedback Matrices rebuild in about a second, but the Guess Count Matrices do not, and a lost or cleaned working copy loses them.

## Solution

- **One folder per kind of file.** The gpui app reads and writes `precompute-cache/feedback/` and `precompute-cache/guess-counts/`, the folders Python and the backend already use. Either tool resumes the other's Guess Count Matrix (the resume check already ignores the manifest's `tool`).
- **An xz backup in git.** `just backup-cache` (`src/precompute_backup.py backup`) compresses every folder of `precompute-cache/` except `feedback/` into `data/precompute/<folder>/<file>.xz`, which is committed. It refuses a Guess Count Matrix whose `summary.json` says a Strategy has unfinished rows, unless `--partial`. `just restore-cache` decompresses it back into `precompute-cache/`. `--folder NAME` and `--yes` work on both.
- **The word lists stay inside each package** (`packages/wordle/src/wordle/data/`, `app/wordle-gpui/data/`), so the wheel and the binary carry them; a Python test checks the two copies are identical.

## Decisions

- The two writers never run on one file at once in practice (one user); no lock file.
- The Rust test that compares its summary files with Python's needs Python's output in a separate folder: it reads `WORDLE_PYTHON_GUESS_COUNTS`, else `precompute-cache/guess-counts/` when its manifest says Python wrote it, else skips.
- The Feedback Matrices are not backed up: rebuilding beats downloading.
- Backups are committed only for finished matrices, so the history grows by about 24 MB per new set, not per run.

## Out of scope

- Git LFS or GitHub Release assets for the backup.
- Moving `precompute-cache/` under `data/`.
