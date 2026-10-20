# Backend Strategy and Flask API

Status: ready-for-agent
Blocked by: 02

Implement ranking by Expected Information and Expected Candidates, with the `pool`, `scope` and `by` options and the tie-break rules from `solver-strategy.md`. Serve `/api/feedback`, `/api/candidates`, `/api/split`, `/api/suggestions` and `/api/solve` as described in the spec. Load the matrices once with mmap. Test each endpoint with Flask's test client, including the 400 for an invalid word. Add `just backend`.

See [spec](../spec.md).
