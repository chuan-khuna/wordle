# Backend Feedback matrices and precompute command

Status: done
Blocked by: 01

Build the Answer × Answer and Guess × Answer matrices (vectorised numpy, optional threads) into `app/backend/matrices/` (gitignored). Add a precompute CLI (`--threads`, `--out`, `--yes`) and `just backend-precompute`. Add a test that the output is byte-identical to `packages/wordle`'s `matrix` build, and that each cell agrees with the backend's own Feedback.

See [spec](../spec.md).

## Comments

Added `matrices.py` and `precompute.py` to the backend, `just backend-precompute` (about 4 s on one thread, 1 s on four), and `tests/test_matrices.py`. The byte-identical test builds the reference by running `uv run src/precompute.py` at the repo root into a temp dir, and skips if that cannot run. The command does not prompt for threads (default 1); it only asks before overwriting unless `--yes`.
