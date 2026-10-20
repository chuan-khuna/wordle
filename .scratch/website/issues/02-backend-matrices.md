# Backend Feedback matrices and precompute command

Status: ready-for-agent
Blocked by: 01

Build the Answer × Answer and Guess × Answer matrices (vectorised numpy, optional threads) into `app/backend/matrices/` (gitignored). Add a precompute CLI (`--threads`, `--out`, `--yes`) and `just backend-precompute`. Add a test that the output is byte-identical to `packages/wordle`'s `matrix` build, and that each cell agrees with the backend's own Feedback.

See [spec](../spec.md).
