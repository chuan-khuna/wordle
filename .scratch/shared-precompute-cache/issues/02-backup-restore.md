# 02: `just backup-cache` and `just restore-cache`

**What to build:** `src/precompute_backup.py` with `backup` and `restore`, run by `just backup-cache` and `just restore-cache`. Backup xz-compresses each folder of `precompute-cache/` except `feedback/` into `data/precompute/<folder>/` (one `<file>.xz` per file, stale files removed), refusing an unfinished Guess Count Matrix unless `--partial`. Restore decompresses it back, replacing the folder. The finished Guess Count Matrices are backed up and committed.

**Blocked by:** 01

**Status:** done

- [x] Backup and restore round-trip byte for byte
- [x] `data/precompute/guess-counts/` holds the finished matrices, summary, rankings and manifest
- [x] A test checks the package's and the gpui app's word lists are identical
- [x] A document describes the backup and restore (and the index links it)

See [spec](../spec.md).

## Comments

Done. xz preset 6 (preset 9 was about 3% smaller and slower). The round trip was checked by decompressing every backup and comparing it with the original, then by running `restore`. `data/precompute/guess-counts/` holds the gpui app's finished run of all four Strategies, about 24.5 MB. The word-list test is `packages/wordle/tests/test_word_lists.py`.
