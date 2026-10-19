# Game and State

How `packages/wordle/src/wordle/game.py` models a Game. The terms (Game, Guess, State, Win, Loss) are defined in [GLOSSARY.md](../../GLOSSARY.md).

## Classes

| Class | What it holds |
| --- | --- |
| `Guess` | `number` (1–6), `word`, `feedback`. `is_win` and `render()` (one coloured line with ANSI codes; also `str(guess)`) |
| `State` | A tuple of `Guess`es. Iterable, has `len()`, `last`, `render()` (one line per Guess; also `str(state)`) |
| `Game` | The `answer`, the `word_lists`, and the current `State` |
| `InvalidGuess` | Raised for a word the game refuses. It doesn't use up a Guess |
| `GameOver` | Raised for a Guess made after a Win or a Loss |

`Guess` and `State` are frozen dataclasses. `Game` never changes a `State`; each Guess makes a new one with `State.add()`. So a `State` you keep hold of is a snapshot that stays the same while the Game carries on, which is what a Solver needs.

## Making a Game

```python
from wordle.game import Game
import random

Game("crane")                      # fixed Answer; must be on the Answer List
Game.random()                      # random Answer
Game.random(random.Random(7))      # same Answer every time for seed 7
```

## Playing

```python
guess = game.guess("slate")        # returns the new Guess
print(guess)                       # coloured tiles
game.state, game.guesses_left
game.is_won, game.is_lost, game.is_over
```

`game.guess(word)`:

1. Raises `GameOver` if the Game already ended.
2. Calls `check_guess(word)`: trims and lowercases the word, then raises `InvalidGuess` if it isn't five letters or isn't on the Guess List.
3. Works out the Feedback and adds a new `Guess` to the State.

`check_guess` is public so a UI can validate input *before* submitting it; the terminal game uses it to show errors while you type.

## Win and Loss

- **Win:** the last Guess is all Correct. The Game is over straight away.
- **Loss:** six Guesses and none is the Answer.

## Trying words after a Game is over

A `Game` follows the real rules and refuses Guesses once it is over. To see what any word would have got (for example the _AKER trap: MAKER, TAKER, FAKER… against BAKER), call `feedback()` directly; it has no limits:

```python
from wordle.feedback import feedback
from wordle.game import Guess

for word in ["maker", "taker", "faker", "baker"]:
    print(Guess(0, word, feedback(word, "baker")))
```

## Fixed from the reference game

The game loop in the reference `utils/wordle.py` had bugs that this design avoids: it crashed on NumPy ≥ 1.24 (`np.int`), never detected a Win, revealed the Answer only after a 7th Guess, returned all-Absent Feedback for refused words, and didn't lowercase input.
