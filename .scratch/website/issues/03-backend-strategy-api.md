# Backend Strategy and FastAPI API

Status: done
Blocked by: 02

Implement ranking by Expected Information and Expected Candidates, with the `pool`, `scope` and `by` options and the tie-break rules from `solver-strategy.md`. Serve `/api/feedback`, `/api/candidates`, `/api/split`, `/api/suggestions` and `/api/solve` as described in the spec. Load the matrices once with mmap. Test each endpoint with FastAPI's `TestClient`, including the 400 for an invalid word (return 400 with a message, not FastAPI's default 422). Add `just backend`, which serves the app with uvicorn.

See [spec](../spec.md).

## Comments

Done. `strategy.py` and `api.py` in `app/backend/wordle_backend/`, `just backend` added. Feedback in JSON is a five-digit string (0 Absent, 1 Present, 2 Correct); responses give `marks` and `code`. The 400 handler also covers missing or malformed parameters. See `docs/documents/web-backend.md`.
