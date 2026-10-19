# Word list sources

| File | Glossary term | Words | Source |
| --- | --- | --- | --- |
| `answers.txt` | Answer List | 2,315 | [Original Wordle answers, alphabetical](https://gist.github.com/cfreshman/a03ef2cba789d8cf00c08f767e0fad7b) (`wordle-answers-alphabetical.txt`) |
| `guesses.txt` | Guess List | 14,855 | [NYT Wordle allowed guesses as of 2026-03-06](https://gist.github.com/cfreshman/8b92bc418b43096094cf5d1b0eea8f84) (`nyt-wordle-allowed-guesses-2026-03-06.txt`) |

Downloaded 2026-10-19. One lowercase five-letter word per line, sorted. Every word in `answers.txt` is also in `guesses.txt`.

Copied from `packages/wordle/src/wordle/data/`. Keep both copies the same: a Seed picks the same Answer in both games only while the Answer Lists match.
