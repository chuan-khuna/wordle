# Guess Count Matrix

Status: ready-for-agent

## Problem Statement

The Opener leaderboard ranks every Guess List word by its Expected Information as a first Guess, and the Benchmark measures each Strategy from one Opener only. Neither answers the question a reader actually asks: "if I open with this word and the Solver plays the rest, how many Guesses does it take to Win, on average, across the Answer List?" The two can disagree. With the Candidates-only Strategy the Solver's own Opener (raise, 3.582 with 11 Losses) is beaten by salet (3.528 over all Answers) and tesla (3 Losses), and tesla ranks only 229th by Expected Information.

Answering it means playing every Answer from every Opener with each Strategy. Done naively that is about 36 hours per global Strategy, with nothing to show while it runs and nothing kept if it stops. The precomputed files are also scattered: each of the package, the backend and the gpui app keeps its own copy of the Feedback Matrices.

## Solution

A precompute command fills one **Guess Count Matrix** per Strategy: one row per Opener (all 14,855 Guess List words), one column per Answer (2,315), each cell the Guess Count of that Game. Games are played to a Win with no Guess Limit, so a Game that would be a Loss under the Guess Limit of six keeps the Guess Count it needed. It also writes a summary that ranks every Opener by its Average Guess Count over the whole Answer List, with its Losses under the Guess Limit beside it.

Four Strategies are covered, every combination of which words may be guessed (Candidates only, or the whole Guess List) and what the Guess is ranked by (Expected Information, or Expected Candidates). The new one, Expected Candidates over Candidates only, joins the Benchmark too.

The command works like `just precompute`: it asks for whatever is not given as a flag, shows a progress bar for each Opener being played and one for the whole run, spreads the work over several threads, and resumes where it stopped.

Every precomputed file moves into one gitignored `precompute-cache/` folder at the repo root, shared by the package, the backend and the gpui app.

## User Stories

1. As a researcher, I want the Guess Count of every Opener against every Answer, so that I can study which Openers are best by actual play rather than by first-turn statistics.
2. As a researcher, I want one Guess Count Matrix per Strategy, so that I can compare Strategies Opener by Opener.
3. As a researcher, I want all four Strategies (Candidates only or global, by Expected Information or Expected Candidates), so that I can separate the effect of scope from the effect of the ranking.
4. As a researcher, I want rows for every Guess List word, so that an Opener that is not on the Answer List, or ranks low by Expected Information, is not missed.
5. As a researcher, I want the rows and columns in the same sorted order as the Guess × Answer Feedback Matrix, so that I can index both the same way.
6. As a researcher, I want a Loss to keep its real Guess Count, so that I can apply any Guess Limit when reading the matrix.
7. As a researcher, I want each Opener's Average Guess Count over all 2,315 Answers, so that hard Answers are not dropped from the average.
8. As a researcher, I want each Opener's Losses and Guess Distribution under the Guess Limit of six, so that I can see how often it would lose a real Wordle.
9. As a researcher, I want Openers ranked by Average Guess Count, then Expected Information, then alphabetically, so that the ranking is total and repeatable.
10. As a researcher, I want a small summary file keyed by word, so that I can read the results without loading 132 MB of matrices or the word lists.
11. As the person running the precompute, I want the command to ask how many threads to use, as `just precompute` does, so that I don't have to remember the flags.
12. As the person running the precompute, I want to choose which Strategies to compute, so that I can run the quick Candidates-only ones first and the global ones overnight.
13. As the person running the precompute, I want every question skippable by a flag, so that I can script it.
14. As the person running the precompute, I want a progress bar for each Opener being played, showing how many of its 2,315 Answers are settled, so that I can see it is working.
15. As the person running the precompute, I want an overall progress bar across every Opener and Strategy in the run, with an estimate of the time left, so that I know when it will finish.
16. As the person running the precompute, I want the work spread over several threads, so that the global Strategies take hours, not days.
17. As the person running the precompute, I want a stopped run to resume from the rows it had not finished, so that hours of work are not lost.
18. As the person running the precompute, I want to be asked whether to resume or start over when results already exist, so that I never discard them by accident.
19. As the person running the precompute, I want a flag to start over without asking, so that I can rebuild after changing a Strategy.
20. As the person running the precompute, I want the command to say where it wrote each file and how long it took, as `just precompute` does.
21. As a developer, I want results that are the same whatever the thread count, so that parallelism never changes a number.
22. As a developer, I want the Guess Count of a row to match playing each Game one at a time, so that the shared tree play is trusted.
23. As a developer, I want the tree play in the package, so that the backend, the gpui app and a static site can all reuse it.
24. As a developer, I want the four named Strategies defined once in the package, so that the Benchmark and the Guess Count Matrix cannot drift apart.
25. As a developer, I want every precomputed file in one `precompute-cache/` folder, so that there is one copy of the Feedback Matrices instead of three.
26. As a developer, I want `precompute-cache/` gitignored, so that hundreds of megabytes never reach the repository.
27. As a reader of the Benchmark, I want the new Strategy (Expected Candidates, Candidates only) in the Benchmark chart, so that all four Strategies can be compared there too.
28. As a reader of the Benchmark, I want each Strategy's Benchmark to keep starting from that Strategy's own first pick, so that it measures the Solver as it really plays.
29. As an Article author, I want to show that the best Opener by Expected Information is not the best by Average Guess Count, so that the Series can explain why a first-turn score is not the whole story.
30. As a gpui app user, I want the app to find the Feedback Matrices in the shared folder, so that I don't have to precompute them separately for the app.
31. As a backend operator, I want the backend to read the shared folder, so that `just backend-precompute` and `just precompute` no longer write separate copies.

## Implementation Decisions

- **Glossary.** The term is **Guess Count Matrix** (added to the glossary), not "turn to win". The ranking quantity is the Average Guess Count with no Guess Limit, which fits the existing definition of Average Guess Count because every Game is then a Win.
- **One shared folder**, `precompute-cache/` at the repo root, gitignored in place of the three `matrices/` folders:
  ```
  precompute-cache/
  ├── feedback/        answers_vs_answers.npy, guesses_vs_answers.npy
  ├── guess-counts/    bits-candidates.npy, expected-candidates.npy, bits-all.npy, expected-all.npy, summary.json
  └── benchmark/       benchmark.json, openers.json
  ```
  The package's default matrix directory, the backend's directory and the gpui app's matrix path all point here. `just precompute` and `just backend-precompute` both write here.
- **Four named Strategies**, defined once in the package (moved from the backend's Benchmark) and named by id. A Strategy is scope × rank; under Candidates only the pool makes no difference, and the global Strategies use the Guess List. Answer List words outside the Candidate Set as a fifth option are not included.

  | id | scope | ranked by | |
  |---|---|---|---|
  | `bits-candidates` | Candidates only | Expected Information | existing |
  | `expected-candidates` | Candidates only | Expected Candidates | new |
  | `bits-all` | Guess List | Expected Information | existing |
  | `expected-all` | Guess List | Expected Candidates | existing |

  The new Strategy is named "Expected Candidates, Candidates only". The Benchmark plays all four, each from its own first pick on the full Answer List, as today.
- **Tree play in the package.** The tree play that today lives in the backend's Benchmark (every Answer with the same Feedback so far shares a Candidate Set and so the next Guess) moves into a new package module next to the matrix module. It returns the Guess Count of every Answer for one Strategy and one Opener, with the 12-Guess safety limit, and keeps the existing rule that with two or fewer Candidates left the search goes Candidates only. The backend's Benchmark and the Guess Count Matrix both call it.
- **Next-Guess cache.** The next Guess depends only on the Candidate Set, so it is cached by Candidate Set across Openers, one cache shared by every thread. Measured on one thread: Candidates-only Strategies about 0.02 s per Opener (500 in 12 s); global Strategies about 5 s per Opener, down from 8.7 s without the cache.
- **Matrix files.** One `.npy` per Strategy, 14,855 × 2,315, `uint8`, named by Strategy id. Rows and columns are in the sorted order of the Guess × Answer Feedback Matrix. A cell is the Guess Count (1 to 13, 13 meaning unsolved by the safety limit). The file is created at full size and written in place (a memory-mapped `.npy`); a row of zeros is unfinished, since no Guess Count is 0.
- **Resume.** A run fills only rows that are still zero. Rows are committed whole (a row is written only once its Opener is fully played), and the file is flushed regularly, so a stopped run loses at most the rows in flight. Starting over clears the file first.
- **Build interface.** The package exposes one build function taking the output directory, the Strategies, the thread count, whether to start over, and an optional list of Openers to fill (default: all). The command and the tests both call it. Unlisted rows are left as they are.
- **Parallelism.** Openers are spread over a thread pool, as the Feedback Matrix build and the Benchmark already do: numpy lets go of the GIL inside its array work, and each thread writes only its own rows. The threads share one memory map of the Feedback Matrices and one next-Guess cache. Results do not depend on the thread count. The tree play also runs Python between numpy calls, which holds the GIL, so the speed-up may stop short of the thread count; the first full run measures it, and if it scales badly, worker processes are the fallback (behind the same option).
- **Summary file.** `summary.json` holds, for each Strategy, every Opener whose row is complete, ranked by Average Guess Count over all Answers, then by Expected Information as a first Guess, then alphabetically. Each entry has the rank, word, Average Guess Count, Losses and Guess Distribution under the Guess Limit of six (Games won in 1 to 6 Guesses), Expected Information, and whether the Opener is on the Answer List. It is rewritten at the end of every run, including a partial one, and says how many rows each Strategy has complete.
- **Command.** `just precompute-guess-counts`, built like `just precompute` (questionary prompts, an argparse flag for each, a flag skips its question):
  - "How many threads?" with the same choices as `just precompute` (1, 2, 4, 8); `--threads N` skips it.
  - "Which Strategies?" as a checkbox, all four ticked by default; `--strategy ID`, repeatable, skips it.
  - If any chosen Strategy already has rows filled: "Resume, start over or cancel?" with resume as the default; `--fresh` starts over and `--yes` resumes without asking.
  - `--out DIR` changes the output folder (default `precompute-cache/`).
  - Ctrl+C at any question exits without writing; Ctrl+C during the run stops cleanly and keeps the finished rows.
  - At the end it prints each file it wrote with its size, how many rows each Strategy has complete, the top Openers per Strategy, and the elapsed time, as `just precompute` prints its files and time.
- **Progress bars (tqdm).** tqdm is added to the package's dependencies.
  - One overall bar: Openers completed out of the rows to fill across every chosen Strategy, with rate and time left. On resume it starts at the rows already done.
  - One bar per thread for the Opener it is playing, labelled with the Strategy id and the word: Answers settled out of 2,315. It resets for each Opener.
  - Each thread keeps its bar on its own line (a fixed tqdm position), so the bars do not garble each other.
- **The backend's Benchmark precompute** keeps its flags and outputs; it gains the fourth Strategy and writes into `precompute-cache/benchmark/`.

## Testing Decisions

- Good tests here check only what the build writes (the matrix rows, the summary) and what the Benchmark returns, never how the tree is walked, how work is split between threads or what the cache holds.
- **The one new seam is the package's build function**, called with a temporary output folder and a few Openers so that a global Strategy finishes in seconds:
  - each filled row equals playing each Game one at a time from that Opener, for all four Strategies, on a few Openers and a subset of Answers;
  - rows not asked for stay zero;
  - a second run leaves filled rows untouched (pre-set a known row, run again, it is still there), and starting over clears them;
  - one thread and several threads give byte-identical files;
  - the summary ranks by Average Guess Count over all Answers, then Expected Information, then alphabetically, and counts Losses and the Guess Distribution under the Guess Limit of six correctly (checked on a hand-filled matrix with a Loss in it).
- **Prior art.** The backend's Benchmark tests already check tree play against playing each Game alone (`play_alone` over a subset of Answers) and are parametrised over every Strategy, so the new Strategy is covered there once it is in the list. The package's matrix tests show building into a temporary folder. The backend's test setup builds the Feedback Matrices when they are missing.
- **Moving to `precompute-cache/`** is covered by the existing package, backend and gpui (`cargo test`) tests passing with the new paths.
- The command's prompts and progress bars are not unit-tested; they are checked by running the command once on the Candidates-only Strategies.

## Out of Scope

- The website: `/api/openers` with a Strategy and Average Guess Count, the Opener table's new columns, and serving `summary.json` to a static build. A later issue, needing its own decisions.
- Changing the Solver's Opener, in any app, to the best Opener from the Guess Count Matrix.
- Hard Mode, and Strategies that look further ahead than one Guess.
- A fifth Strategy that guesses Answer List words outside the Candidate Set.
- Shipping the Guess Count Matrices with the gpui app or the website.

## Further Notes

- Expected cost of a full run, all 14,855 rows: Candidates-only Strategies about 6 minutes each on one thread; global Strategies about 20 hours each on one thread. How much threads cut that is not yet measured (perfect scaling on 8 threads would be about 2.5 hours each); the first full run should record the real figure in the implementation document.
- From a probe of the top 500 Openers by Expected Information with the Candidates-only Strategy: salet ranks first by Average Guess Count (3.528 over all Answers, 8 Losses), tesla has the fewest Losses (3), and raise, the Solver's own Opener, gives 3.582 over won Games with 11 Losses. With the global Strategy, tarse stays first among the top 30 (3.429, no Losses).
- The Feedback Matrix documentation, the web backend and gpui app documents and the documents index are updated with the new folder, and a new implementation document describes the Guess Count Matrix and its command.
