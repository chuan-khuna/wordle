# Game and State

How `packages/wordle/src/wordle/game.py` models a Game. The terms (Game, Guess, State, Win, Loss) are defined in [GLOSSARY.md](../../GLOSSARY.md).

## Classes

| Class | What it holds |
| --- | --- |
| `Guess` | `number` (counting from 1), `word`, `feedback`. `is_win` and `render()` (one coloured line with ANSI codes; also `str(guess)`) |
| `State` | A tuple of `Guess`es. Iterable, has `len()`, `last`, `render()` (one line per Guess; also `str(state)`) |
| `Game` | The `answer`, the `word_lists`, the Guess Limit (`max_guesses`), the `seed` (for random Games), and the current `State` |
| `InvalidGuess` | Raised for a word the game refuses. It doesn't use up a Guess |
| `GameOver` | Raised for a Guess made after a Win or a Loss |

`Guess` and `State` are frozen dataclasses. `Game` never changes a `State`; each Guess makes a new one with `State.add()`. So a `State` you keep hold of is a snapshot that stays the same while the Game carries on, which is what a Solver needs.

## Making a Game

```python
from wordle.engine.game import Game

Game("crane")                      # fixed Answer; must be on the Answer List
Game.random()                      # random Answer; the Seed it used is in game.seed
Game.random(7)                     # same Answer every time for Seed 7
Game("crane", max_guesses=None)    # no Guess Limit: keep guessing until you win
```

## Playing

```python
guess = game.guess("slate")        # returns the new Guess
print(guess)                       # coloured tiles
game.state, game.guesses_left     # guesses_left is None when there's no Guess Limit
game.is_won, game.is_lost, game.is_over
```

`game.guess(word)`:

1. Raises `GameOver` if the Game already ended.
2. Calls `check_guess(word)`: trims and lowercases the word, then raises `InvalidGuess` if it isn't five letters or isn't on the Guess List.
3. Works out the Feedback and adds a new `Guess` to the State.

`check_guess` is public so a UI can validate input *before* submitting it; the terminal game uses it to show errors while you type.

## Win and Loss

- **Win:** the last Guess is all Correct. The Game is over straight away.
- **Loss:** the Game reaches its Guess Limit (`max_guesses`, six by default) without a Win. With `max_guesses=None` a Game is never lost.

## Seeds

`Game.random(seed)` picks the Answer with `random.Random(seed)`, so a Seed always gives the same Answer (for the same Answer List). Without a seed, `Game.random()` picks one from 0 to `MAX_SEED` (999,999) and stores it in `game.seed`, so every random Game can be replayed. A Game made with a chosen Answer has `seed = None`.

## Trying words after a Game is over

A `Game` follows the real rules and refuses Guesses once it is over. To keep guessing past six, start the Game with `max_guesses=None`. To see what any word would have got (for example the _AKER trap: MAKER, TAKER, FAKER… against BAKER), call `feedback()` directly; it has no limits:

```python
from wordle.engine.feedback import feedback
from wordle.engine.game import Guess

for word in ["maker", "taker", "faker", "baker"]:
    print(Guess(0, word, feedback(word, "baker")))
```

## Fixed from the reference game

The game loop in the reference `utils/wordle.py` had bugs that this design avoids: it crashed on NumPy ≥ 1.24 (`np.int`), never detected a Win, revealed the Answer only after a 7th Guess, returned all-Absent Feedback for refused words, and didn't lowercase input.
