# Backend reuses the package engine; main.py and routers

Status: ready-for-agent
Blocked by: 04

Make `app/backend/` depend on `packages/wordle` through a uv path dependency, and delete the backend's own copies of the word lists, Feedback, Candidates, matrices and Strategy code in favour of the package's. Where the backend behaves differently from the package (for example the switch to Candidates only at two or fewer Candidates inside `rank`), keep the web behaviour the spec asks for without forking the engine: a thin wrapper in the backend, or a small change in the package if it is the right home. Replace `api.py` with `wordle_backend/main.py` as the FastAPI entry point and `wordle_backend/routers/*.py` for the endpoints. Keep the API's JSON, the 400 errors and every existing test's behaviour; drop tests that only covered the deleted copies. Update `just backend`, `docs/documents/web-backend.md`, `INDEX.md` and `architecture.md`.

See [spec](../spec.md).
