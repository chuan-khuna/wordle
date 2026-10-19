# Wordle

An interactive Wordle game you play in the terminal, plus a solver that suggests guesses and explains why.

It's built to make content as well as to play. Every game, guess and solver decision can be shown, replayed and measured, so the results can go straight into an article or video.

> **Status:** early. The project is scaffolded but the game and solver aren't implemented yet. Sections marked *(planned)* describe the intended behaviour.

## Features

### Play *(planned)*

- Guess a hidden 5-letter word in six tries.
- Each letter is coloured after a guess: green (right letter, right spot), yellow (in the word, wrong spot), grey (not in the word).
- Pick a random word or a fixed one, so a game can be replayed exactly for a recording.

### Solve *(planned)*

- Suggest the next best guess from the feedback so far.
- Show how many candidate words are left after each guess, and why the suggestion was picked (letter frequency, expected information).
- Plug in your real Wordle game: type your guesses and their colours to get help.

### Analyse *(planned)*

- Run the solver over every answer word and report the average number of guesses and how the guess counts are spread.
- Compare opening words and strategies.
- Export the results as CSV for charts in articles and videos.

## Getting started

Requires [uv](https://docs.astral.sh/uv/). uv installs the pinned Python version (see `.python-version`) for you.

```sh
git clone <repo-url> wordle
cd wordle
uv run main.py
```

## Using it for an article or video

- **Reproducible games:** fix the answer word (and the random seed) so a game plays out the same way on every take.
- **Explainable steps:** the solver prints its reasoning at each step, which you can narrate or quote.
- **Data you can chart:** batch runs write plain CSV that drops into a spreadsheet, a notebook or a plotting library.

## Project layout

| Path | What it is |
| --- | --- |
| `main.py` | Entry point |
| `docs/agents/` | Notes for coding agents (issue tracker, triage labels, domain docs) |
| `references/` | Third-party projects cloned for reference (git-ignored; see `references/README.md`) |

## Credits and references

- [chuan-khuna/wordle-but-statistics](https://github.com/chuan-khuna/wordle-but-statistics): letter statistics and guessing strategies for English and Thai Wordle
- [3Blue1Brown: Solving Wordle using information theory](https://www.youtube.com/watch?v=v68zYyaEmEA)

Wordle was created by Josh Wardle and is now owned by The New York Times. This project isn't affiliated with either.
