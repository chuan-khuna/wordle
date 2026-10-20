# Guess Count Matrix in the gpui app

Status: ready-for-agent

Builds on [the Guess Count Matrix spec](../guess-count-matrix/spec.md), which defines the matrix, its files and its summary. This spec brings the same feature to the gpui app: computing it, and showing it.

## Problem Statement

The Guess Count Matrix is built by a Python command, and its two global Strategies take about 20 hours each on one thread, because most of the tree play is Python between numpy calls. The gpui app already re-implements the engine and the Solver in Rust, and already builds the Feedback Matrices from its menu, byte-for-byte the same as Python; but it has no tree play, ranks Suggestions by Expected Information only, and cannot tell a player how well an Opener actually plays out. A player choosing an Opener in the Solver panel sees its bits and Expected Candidates for the first Guess, not how many Guesses it takes on average to Win, nor its Guess Distribution.

## Solution

The gpui app gets the whole feature:

1. Its Solver ranks by either measure (Expected Information or Expected Candidates) and picks Guesses exactly as the Python Solver does, so the four named Strategies give the same Guesses in both.
2. **Precompute guess counts…** in the menu and command palette fills the Guess Count Matrices and `summary.json` in `precompute-cache/guess-counts/`, the same files as `just precompute-guess-counts`, from Rust, on several threads, in the background, with progress in the status bar. A run resumes rows left unfinished by either tool.
3. The Solver panel shows, for the word being charted before the first Guess, its Average Guess Count, Losses and Guess Distribution under the panel's current Strategy, as a bar chart: Games per Guess Count, with Losses as a last bar.

## User Stories

1. As a gpui app user, I want the Solver panel to rank by Expected Candidates as well as Expected Information, so that I can follow either Strategy.
2. As a gpui app user, I want the panel's settings to name the Strategy they amount to, so that I can match them with the Benchmark and the website.
3. As a gpui app user, I want the Solver to pick the same Guess as the Python Solver for the same State and Strategy, so that results agree between the apps.
4. As a gpui app user, I want **Precompute guess counts…** in the menu and the command palette, so that I can build the Guess Count Matrices without a terminal.
5. As a gpui app user, I want to choose the thread count, as for Precompute matrices, so that I can trade speed for a usable machine.
6. As a gpui app user, I want to choose which Strategies to compute, so that I can run the quick Candidates-only ones first.
7. As a gpui app user, I want the work to run in the background, so that I can keep playing.
8. As a gpui app user, I want the status bar to show progress (Strategy, Openers done out of the total, time left), so that I know how long it will take.
9. As a gpui app user, I want to stop a run, and have the finished rows kept, so that I can resume later.
10. As a gpui app user, I want a run to resume from rows left unfinished, whichever tool started them, so that no work is repeated.
11. As a gpui app user, I want a status bar message when the run ends, with where the files went and how long it took, as Precompute matrices does.
12. As a gpui app user, I want to be told when the Feedback Matrices are missing, so that I know to precompute them first.
13. As a researcher, I want the gpui app's matrix files to be byte-for-byte the same as the Python command's, so that either tool can build them.
14. As a researcher, I want the gpui app's `summary.json` to hold the same entries as the Python command's, so that the website and the notebooks can read either.
15. As a researcher, I want the global Strategies to finish in far less time than the Python command, so that a full run is practical.
16. As a gpui app user, I want to see an Opener's Average Guess Count in the Solver panel, so that I can pick an Opener by how it actually plays out.
17. As a gpui app user, I want to see an Opener's Losses, so that I know how often it would lose under the Guess Limit.
18. As a gpui app user, I want a Guess Distribution chart for the charted Opener, so that I can see its spread of Guess Counts at a glance.
19. As a gpui app user, I want the Guess Distribution to follow the panel's Strategy, so that I can compare Strategies for one Opener.
20. As a gpui app user, I want the Suggestions before the first Guess to show each Opener's Average Guess Count when it is known, so that I can compare the top Openers.
21. As a gpui app user, I want a short note instead of the chart when the Guess Count Matrix for the current Strategy is missing or the Opener's row is unfinished, so that I know why there is nothing to show and which command fills it.
22. As a gpui app user, I want the chart drawn in the theme's colours, so that it fits every theme.
23. As a gpui app user, I want the chart only before the first Guess, so that it is never mistaken for a statement about the current State.
24. As a developer, I want the tree play, the build and the summary in the library with no window, so that they are tested like the rest of the solver.
25. As a developer, I want the results not to depend on the thread count, so that parallelism never changes a number.

## Implementation Decisions

- **Strategies in Rust.** The library gets the same four named Strategies as the Python package (`bits-candidates`, `expected-candidates`, `bits-all`, `expected-all`), each a scope and a ranking. The Solver's ranking follows the Python one exactly: primary measure (bits higher first, or Expected Candidates lower first, both rounded to nine decimals so float noise does not break ties), then Candidate before non-Candidate, then the other measure, then alphabetical; and with two or fewer Candidates left the search goes Candidates only. Today's Rust ranking breaks bit ties by Candidate then alphabetical, without the other measure, so it changes slightly.
- **Solver panel settings.** A third setting, **Rank by** (Expected Information, Expected Candidates), joins **Words** and **Search**. Search Candidates (with either Words) and Search All words with Valid guesses map to the four named Strategies; the panel names the Strategy it amounts to. Answers with All words is not a named Strategy: it still ranks, but has no Guess Count Matrix.
- **Tree play in Rust.** A port of the package's tree play: for one Strategy and one Opener, the Guess Count of every Answer in Answer List order, with the 12-Guess safety limit (13 for unsolved), played over the Guess × Answer Feedback Matrix. The next Guess is cached by Candidate Set.
- **Build.** A library function fills the Guess Count Matrix of each chosen Strategy in `precompute-cache/guess-counts/<id>.npy` (14,855 × 2,315 `u8`, the same `.npy` header as numpy writes, as the Feedback Matrix writer already does), only rows that are still zero, written in place, a row only once its Opener is fully played. It takes the thread count, the Strategies, an optional list of Openers, a progress callback and a stop flag. Openers are split between threads in chunks of consecutive rows, each thread with its own next-Guess cache. It then rewrites `summary.json` with the same fields and ranking as the Python command (Average Guess Count over all Answers, then Expected Information as a first Guess, then alphabetical; Losses and Guess Distribution under the Guess Limit of six).
- **Command.** **Precompute guess counts…** is a `Command` (menu and palette). Its picker follows the Precompute matrices picker: the thread count (1, 2, 4, 8, starting on the largest the machine has cores for), and the Strategies as toggles, all on by default. It runs on gpui's background executor. The status bar shows "Guess counts: bits-all 1,234 / 14,855, about 12 min left"; running the command again while it runs offers to stop it, which keeps finished rows. The end message says where the files went and how long it took. Existing rows are kept (resume); there is no start-over in the app (the terminal command has `--fresh`).
- **Reading the results.** The Solver panel reads `summary.json` (not the matrices) when it opens and again after a run ends. Before the first Guess, each Suggestion shows its Average Guess Count when the summary has it, and the chart area for the charted word adds its Average Guess Count, Losses and a Guess Distribution bar chart (Guess Counts 1 to 6, then Lost), drawn like the Feedback Split bars with theme roles. After the first Guess, none of it shows.
- **Docs.** The gpui app document gets the new setting, command and chart; the Guess Count Matrix document says the gpui app builds the same files, with a measured cost.

## Testing Decisions

- Good tests check what the library returns and writes, never how threads split the work or what a cache holds. The drawing files are not tested, as elsewhere in the app.
- **Seam 1, the Solver's ranking**: for a few States and each of the four Strategies, the Rust top Suggestions equal values printed by the Python Solver (as `cells_match_the_python_examples` does for Feedback), including a tie that only the second measure breaks.
- **Seam 2, the library build**, called with a temporary folder and a few Openers:
  - each row equals playing each Game one at a time in Rust;
  - each row equals the Python command's row for the same Opener and Strategy, when the Python files are present (skipped otherwise, like the existing byte-identical check);
  - rows not asked for stay zero, filled rows are left alone, one thread and several give byte-identical files, and the stop flag keeps finished rows;
  - the summary on a hand-filled matrix with a Loss: ranking with both tie-breaks, Average Guess Count, Losses, Guess Distribution, unfinished rows left out.
- **The picker's state** is tested like `overlays/precompute.rs` (keys in, outcome out).
- Prior art: `solver/matrix_tests.rs` (Python examples, thread independence, `.npy` header), `solver/strategy_tests.rs`, `overlays/precompute_tests.rs`.

## Out of Scope

- A start-over option in the app.
- Guess Count Matrices for the Answers with All words setting.
- Showing results after the first Guess, or for a State.
- Reading the matrices themselves in the panel (the summary is enough).
- The website (its own ticket in the Guess Count Matrix spec).

## Further Notes

- The Python command's ticket 07 (the full run) can use whichever tool is faster once both exist; this spec asks for a measured cost of a global Strategy in Rust.
- The Rust Solver already scores Suggestions on several threads; inside the build each thread should rank on one thread, so the build's threads are the only parallelism.
