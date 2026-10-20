# 04: `just precompute-guess-counts`, one thread (tracer bullet)

**What to build:** A new command fills one Guess Count Matrix per chosen Strategy and writes a summary. Running it with one Strategy gives `precompute-cache/guess-counts/<id>.npy` (14,855 × 2,315 `uint8`, rows and columns in the sorted order of the Guess × Answer Feedback Matrix, each cell the Guess Count of that Game played to a Win, zero for a row not filled) and `summary.json` (for each Strategy, every complete Opener ranked by Average Guess Count over all 2,315 Answers, then Expected Information as a first Guess, then alphabetically; each with rank, word, Average Guess Count, Losses and Guess Distribution under the Guess Limit of six, Expected Information, and whether it is on the Answer List). It runs on one thread; resume, threads and progress bars come in later tickets.

The command is built like `just precompute`: a questionary checkbox "Which Strategies?" (all four ticked by default), skipped by `--strategy ID` (repeatable), plus `--out DIR` (default `precompute-cache/`). The package exposes one build function (output directory, Strategies, an optional list of Openers to fill), which the command and the tests call. At the end it prints each file with its size, the top Openers per Strategy and the elapsed time.

**Blocked by:** 01, 03

**Status:** ready-for-agent

- [ ] `just precompute-guess-counts --strategy bits-candidates` writes the matrix and `summary.json` into `precompute-cache/guess-counts/`
- [ ] Without `--strategy` the command asks which Strategies; Ctrl+C at the question exits without writing
- [ ] Tests at the build function, with a temporary folder and a few Openers: each filled row equals playing each Game alone from that Opener, for all four Strategies, on a subset of Answers; rows not asked for stay zero
- [ ] A test on a hand-filled matrix (with a Loss in it) checks the summary's ranking, Average Guess Count, Losses and Guess Distribution
- [ ] A new implementation document for the Guess Count Matrix and its command, a line for it in the documents index, and the `justfile` recipe

See [spec](../spec.md).

## Comments
