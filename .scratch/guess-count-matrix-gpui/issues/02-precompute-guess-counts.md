# 02: Precompute guess counts… in the gpui app

**What to build:** A Rust port of the tree play and the Guess Count Matrix build, and a **Precompute guess counts…** command (menu and palette) that runs it. The picker chooses the thread count and the Strategies. The work runs in the background with progress in the status bar, can be stopped (finished rows kept), resumes rows left unfinished by either tool, and writes `precompute-cache/guess-counts/<id>.npy` and `summary.json` in the same format as `just precompute-guess-counts`.

**Blocked by:** 01; and the Guess Count Matrix spec's tickets 04 and 05 (they define the files and the resume rules)

**Status:** ready-for-agent

- [ ] The library plays one Opener under one Strategy and returns every Answer's Guess Count (13 when unsolved)
- [ ] The library build fills only zero rows, in place, on N threads, with a progress callback and a stop flag, then rewrites `summary.json`
- [ ] Tests: rows equal playing each Game alone; rows equal the Python command's rows when its files are present; unasked rows stay zero; filled rows kept; 1 and N threads byte-identical; the stop flag keeps finished rows; the summary on a hand-filled matrix
- [ ] The command, its picker (state tested like the Precompute matrices picker), the status bar progress and end message, and stopping a run work in the app
- [ ] The gpui app and Guess Count Matrix documents describe it, with the measured time of a global Strategy

See [spec](../spec.md).

## Comments

- 2026-10-20: the byte-level format and what this writer must match (header, row/column order, zeroed rows, `manifest.json`, CSV `True`/`False`, float printing) are in [docs/documents/npy-in-python-and-rust.md](../../../docs/documents/npy-in-python-and-rust.md#contract-for-a-second-writer-of-the-guess-count-matrix).
