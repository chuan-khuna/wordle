# Terminal UI

How the playable game in `packages/wordle/src/wordle/cli.py` works. It uses [questionary](https://questionary.readthedocs.io/) for prompts and [rich](https://rich.readthedocs.io/) for drawing.

## Flow

1. **Menu** (`ask_for_game`, a `questionary.select`):
   - 🎲 **Random word**
   - 🤫 **Choose the word (for a friend)**: typed in a password prompt so it stays hidden; must be on the Answer List
   - 🔁 **Replay with a seed**: same seed, same Answer
   - 👋 **Quit**

   Then **How many guesses?**: 🟩 Classic (6) or ♾️ Unlimited (practice).
2. **Play** (`play`): the screen is cleared and redrawn after every Guess. The Guess prompt validates as you type using `Game.check_guess`, so a refused word never reaches the Game.
3. **End:** a message (🎉 "Genius!" … "Phew!" by Guess count, "Got there!" after more than six, or 😵 with the Answer), the emoji share grid, a **Replay** command, then **Play again?**

`--answer WORD` or `--seed N` on the command line skip the menu for the first Game; add `--unlimited` for no Guess Limit.

## Replaying a Game

Every random Game shows its Seed in the panel's subtitle, and every Game ends (or gives up) with the command that replays it, e.g. `Replay: uv run src/main.py --seed 36293`. A Game with a chosen word has no Seed, so its replay command uses `--answer` (shown only after the Answer is revealed).

## Screen

Drawn inside a rich `Panel` titled **W O R D L E**. The subtitle (`status_line`) shows the Guesses left (or `guess N · no limit`) and the Seed:

- **Board** (`draw_board`): played rows show the letters coloured by their Mark. Below them are empty rows up to the Guess Limit, or a single empty row in an unlimited Game, so the board grows as you guess.
- **Keyboard** (`draw_keyboard`): QWERTY rows. Each key takes the best Mark known for that letter (`best_marks`: Correct beats Present beats Absent); unused keys are light grey.
- **Share grid** (`share_grid`): `Wordle 3/6` (or `X/6`, or `9/∞` in an unlimited Game) and 🟩🟨⬛ rows, printed under the panel.

Colours match the real Wordle: green `#6aaa64`, yellow `#c9b458`, grey `#787c7e`.

## Quitting

Ctrl-C at the Guess prompt gives up and shows the Answer and the replay command. In an unlimited Game this is the only way out without winning. Ctrl-C or "No" at **Play again?** quits.

## Testing it without a keyboard

questionary is built on prompt_toolkit, so a script can feed it keystrokes through a pipe and capture rich's output in a string:

```python
import io, sys
from prompt_toolkit.application import create_app_session
from prompt_toolkit.input import create_pipe_input
from prompt_toolkit.output import DummyOutput
from rich.console import Console
import wordle.cli as cli

buf = io.StringIO()
cli.console = Console(file=buf, width=80, color_system=None)
sys.argv = ["wordle", "--answer", "abide"]
with create_pipe_input() as inp, create_app_session(input=inp, output=DummyOutput()):
    inp.send_text("speed\r" "abide\r" "n\r")   # two Guesses, then "No" to Play again
    cli.main()
print(buf.getvalue())
```

Arrow keys are `"\x1b[B"` (down) and `"\x1b[A"` (up); Ctrl-C is `"\x03"`. If the keystrokes run out before the program ends, it waits forever, so run such scripts with a timeout.
