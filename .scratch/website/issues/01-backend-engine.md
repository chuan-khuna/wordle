# Backend scaffold, word lists, Feedback and Candidates

Status: ready-for-agent

Create `app/backend/` as a standalone uv project with Flask, numpy and pytest. Copy the word lists and `SOURCES.md` from `packages/wordle/src/wordle/data/`. Implement Feedback (the two-pass rule from `docs/documents/feedback-scoring.md`), Feedback Codes and Candidate filtering. The tests use the repeated-letter examples from that doc. Add `just test-backend`. Start `docs/documents/web-backend.md` and add it to `INDEX.md` and `architecture.md`.

See [spec](../spec.md).
