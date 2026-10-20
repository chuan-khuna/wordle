# 04: A precompute view with progress and a log, instead of the game

**What to build:** While **Precompute guess counts…** or **Precompute matrices…** runs, the window shows a precompute view in place of the game board: progress and a log. Both runs share one view and one window-free progress/log state. The status bar no longer shows either run's progress or its end message. When the run ends (finished, stopped or failed) the view stays, showing the final progress and the whole log, until the player goes back to the game.

- **Progress:** an overall bar (rows done out of rows to fill across the chosen Strategies, starting at the rows already done on a resume) with rate and time left, and a line per chosen Strategy (its rows done out of 14,855, and whether its pass is waiting, running or finished).
- **Log:** timestamped lines, newest at the bottom, scrolled to the end as lines arrive: the run's settings (Strategies, thread count, folder), each Strategy's pass starting (with rows already done and rows to fill), each finished Opener (Strategy id, word, Average Guess Count and Losses of that row), a periodic flush, a stop asked for, and the end (finished, stopped with rows kept, or the error, including a manifest mismatch with what to do).
- **Precompute matrices:** the same view, with a line per matrix (`guesses_vs_answers.npy`, then `answers_vs_answers.npy`, rows done out of its rows) and a log of the settings (threads, folder `precompute-cache/feedback-rust/`), each matrix started and saved with its size, and the end or the error. The library's matrix build reports progress per chunk of rows.
- **Controls:** Stop (the same stop as now: finished rows kept) while a guess counts run goes on (the matrices take about a second, so no Stop); Back to game once it has ended. The game's State is kept underneath and comes back unchanged.

**Blocked by:** 02, 03 (done)

**Status:** done

- [x] The library reports what the log needs (each finished row's Strategy, word and counts, pass starts, flushes; each matrix's start, rows and save) without slowing the build; the log and progress state are plain, window-free code shared by both runs
- [x] Tests: the progress state from a sequence of events (resume start, per-Strategy counts, end states; a matrices run), the log lines for each kind of event, and that the game State is untouched by a run
- [x] The view replaces the board during and after either run, with Stop (guess counts) and Back to game; the status bar shows nothing about the run
- [x] The gpui app document describes the view (and drops the status bar progress), with the index line updated
- [x] `cargo test` and `cargo build` pass

## Comments

- 2026-10-20: Scope widened by the user: Precompute matrices… uses the same view (one shared state and view, no status bar progress for either run).
- 2026-10-20: Done. Library: `guess_count_matrix::build` now takes `events` (replacing `progress`/`Progress`) and reports `Planned` per Strategy before any pass (rows finished, rows to fill, so a resumed run's bar starts at the rows done), `PassStarted`, `RowDone` (Opener, rows done, the row's Average Guess Count and Losses, sent after the write and outside the file's lock), `Flushed` and `PassEnded`; `matrix::build_with` reports `Started`, `Rows` (every 256 rows a thread scores) and `Saved` (shape, bytes, path), with `build` unchanged. Window-free state in `overlays/precompute_run.rs` (`RunState`: items with rows and phase, overall bar, rate over the item going on, time left, log with times since the start, kept to the last 5,000 lines with a count of the dropped ones, `press`, `main_area`), tested in `precompute_run_tests.rs`; event order tested in `guess_count_matrix_tests.rs` and `matrix_tests.rs`. `ui/precompute_view.rs` draws it in the board's island (header with state and Stop or Back to game, overall and per-item bars, the log as a `uniform_list` that follows the newest line while at the end); the window redraws twice a second while a run goes on; keys never reach the hidden board and the Solver panel's Type it is hidden while it shows. The status bar's run progress and end notes are gone (its notes for refusing a command, e.g. missing matrices, stay). Only one precompute runs at a time: Precompute matrices while guess counts run says to stop them first. Log times are elapsed since the run started, not wall-clock times (no clock crate). Not checked by hand in the UI.
