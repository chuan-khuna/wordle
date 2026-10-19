# Wordle

An interactive Wordle game you play in the terminal, plus a solver that suggests guesses and explains why.

It's built to make content as well as to play. Every game, guess and solver decision can be shown, replayed and measured, so the results can go straight into an article or video.

> **Status:** early. You can Play in the terminal; the Solver isn't built yet. Sections marked _(planned)_ describe the intended behaviour.

## Features

### Play

- Guess a hidden 5-letter word in six tries, on a coloured board with an on-screen keyboard that tracks every letter.
- Pick how to play from a menu, have a friend type a hidden word, and get a 🟩🟨⬛ share grid at the end.
- Each letter is coloured after a guess: green (right letter, right spot), yellow (in the word, wrong spot), grey (not in the word).
- Every random game shows its seed, and every game ends with the command to replay it (`--seed`, or `--answer` for a chosen word), handy for re-recording a take.
- Play classic (six guesses) or unlimited (`--unlimited`), to keep guessing until you find it.
- Uses the original Wordle Answer List (2,315 words) and the NYT Guess List (14,855 words). See `packages/wordle/src/wordle/data/SOURCES.md`.

### Solve _(planned)_

- Suggest the next best guess from the feedback so far.
- Show how many candidate words are left after each guess, and why the suggestion was picked (letter frequency, expected information).
- Plug in your real Wordle game: type your guesses and their colours to get help.

### Analyse _(planned)_

- Run the solver over every answer word and report the average number of guesses and how the guess counts are spread.
- Compare opening words and strategies.
- Export the results as CSV for charts in articles and videos.

## Getting started

Requires [uv](https://docs.astral.sh/uv/). uv installs the pinned Python version (see `.python-version`) for you.

```sh
git clone <repo-url> wordle
cd wordle
uv run src/main.py             # random Answer (same as `uv run wordle`)
uv run wordle --answer crane   # fixed Answer
uv run wordle --seed 7         # replay the Answer for seed 7
uv run wordle --unlimited      # no guess limit
uv run pytest                  # run every package's tests
```

With [just](https://just.systems) and a Rust toolchain you can also play in a desktop window:

```sh
just wordle                    # the terminal game
just wordle-gpui               # the desktop app (Rust + gpui)
just wordle-gpui --seed 7      # same Answer as `just wordle --seed 7`
```

## Using it for an article or video

- **Reproducible games:** fix the answer word (and the random seed) so a game plays out the same way on every take.
- **Explainable steps:** the solver prints its reasoning at each step, which you can narrate or quote.
- **Data you can chart:** batch runs write plain CSV that drops into a spreadsheet, a notebook or a plotting library.

## Project layout

| Path               | What it is                                                                          |
| ------------------ | ----------------------------------------------------------------------------------- |
| `pyproject.toml`   | uv workspace root: shared dev tools and test settings                               |
| `src/main.py`      | Entry point to the game (`uv run src/main.py`)                                      |
| `src/*`            | Other Python source code                                                            |
| `packages/wordle/` | The game: word lists, Feedback, Game and State, and the `wordle` command            |
| `packages/*`       | Other Python packages                                                               |
| `app/wordle-gpui/` | The same game as a desktop app, in Rust with gpui                                   |
| `app/*`            | Other Wordle apps                                                                   |
| `justfile`         | `just wordle`, `just wordle-gpui` and the test recipes                              |
| `GLOSSARY.md`      | The words this project uses, written with Matt Pocock's skill                       |
| `docs/documents/`  | How the project is implemented; start at `docs/documents/INDEX.md`                  |
| `docs/agents/`     | Notes for coding agents (issue tracker, triage labels, domain docs)                 |
| `references/`      | Third-party projects cloned for reference (git-ignored; see `references/README.md`) |

## Credits and references

- [chuan-khuna/wordle-but-statistics](https://github.com/chuan-khuna/wordle-but-statistics): my old project on letter statistics and guessing strategies for English and Thai Wordle. This project is its newer version, built in the age of LLM coding agents.
- [3Blue1Brown: Solving Wordle using information theory](https://www.youtube.com/watch?v=v68zYyaEmEA)
- [3Blue1Brown: Oh, wait, actually the best Wordle opener is not "crane"…](https://www.youtube.com/watch?v=fRed0Xmc2Wg)
- [Ballpark Figures: I Solved Wordle\*](https://www.youtube.com/watch?v=h-Rusd72W7U)

Wordle was created by Josh Wardle and is now owned by The New York Times. This project isn't affiliated with either.
