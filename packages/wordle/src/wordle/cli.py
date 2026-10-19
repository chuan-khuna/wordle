"""The terminal game: menus with questionary, the board and keyboard drawn with rich."""

import argparse
import random

import questionary
from rich.align import Align
from rich.console import Console, Group
from rich.panel import Panel
from rich.text import Text

from wordle.feedback import Mark
from wordle.game import MAX_GUESSES, Game, InvalidGuess, State
from wordle.words import WORD_LENGTH, load_word_lists

console = Console()

# The colours of the real Wordle.
TILE_STYLES = {
    Mark.CORRECT: "bold white on #6aaa64",
    Mark.PRESENT: "bold white on #c9b458",
    Mark.ABSENT: "bold white on #787c7e",
}
EMPTY_TILE_STYLE = "on grey23"
UNUSED_KEY_STYLE = "bold black on #d3d6da"
SHARE_SQUARES = {Mark.CORRECT: "🟩", Mark.PRESENT: "🟨", Mark.ABSENT: "⬛"}
KEYBOARD_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"]

RANDOM, CHOOSE, SEED, QUIT = "🎲 Random word", "🤫 Choose the word (for a friend)", "🔁 Replay with a seed", "👋 Quit"


def draw_board(state: State) -> Text:
    """Six rows of tiles: the Guesses so far, then empty rows."""
    board = Text()
    for guess in state:
        for letter, mark in zip(guess.word, guess.feedback):
            board.append(f" {letter.upper()} ", style=TILE_STYLES[mark])
            board.append(" ")
        board.append("\n\n")
    for _ in range(MAX_GUESSES - len(state)):
        for _ in range(WORD_LENGTH):
            board.append("   ", style=EMPTY_TILE_STYLE)
            board.append(" ")
        board.append("\n\n")
    return board


def best_marks(state: State) -> dict[str, Mark]:
    """What each guessed letter is known to be. Correct beats Present beats Absent."""
    known: dict[str, Mark] = {}
    for guess in state:
        for letter, mark in zip(guess.word, guess.feedback):
            if letter not in known or mark.value > known[letter].value:
                known[letter] = mark
    return known


def draw_keyboard(state: State) -> Text:
    """The on-screen keyboard, each key coloured by what we know about that letter."""
    known = best_marks(state)
    keyboard = Text()
    for row in KEYBOARD_ROWS:
        for letter in row:
            style = TILE_STYLES[known[letter]] if letter in known else UNUSED_KEY_STYLE
            keyboard.append(f" {letter.upper()} ", style=style)
            keyboard.append(" ")
        keyboard.append("\n")
    return keyboard


def show(game: Game, message: str = "") -> None:
    console.clear()
    screen = Group(
        Align.center(draw_board(game.state)),
        Align.center(draw_keyboard(game.state)),
        Align.center(Text(message, style="bold")),
    )
    console.print(Panel(screen, title="[bold]W O R D L E[/]", subtitle=f"{game.guesses_left} guesses left", width=48))


def share_grid(game: Game) -> str:
    """The emoji grid people paste into chats, like the real Wordle's Share button."""
    score = len(game.state) if game.is_won else "X"
    rows = ["".join(SHARE_SQUARES[mark] for mark in guess.feedback) for guess in game.state]
    return f"Wordle {score}/{MAX_GUESSES}\n\n" + "\n".join(rows)


def play(game: Game) -> None:
    """Play one Game until it is won or lost (or the player presses Ctrl-C)."""
    show(game)

    def validate(word: str) -> bool | str:
        try:
            game.check_guess(word)
        except InvalidGuess as e:
            return str(e)
        return True

    while not game.is_over:
        word = questionary.text(f"Guess {len(game.state) + 1}:", validate=validate, qmark="✏️").ask()
        if word is None:  # Ctrl-C
            show(game, f"Gave up. The answer was {game.answer.upper()}.")
            return
        game.guess(word)
        show(game)

    if game.is_won:
        cheers = ["Genius!", "Magnificent!", "Impressive!", "Splendid!", "Great!", "Phew!"]
        show(game, f"🎉 {cheers[len(game.state) - 1]}")
    else:
        show(game, f"😵 The answer was {game.answer.upper()}")
    console.print(share_grid(game))


def ask_for_game() -> Game | None:
    """Ask how to pick the Answer for the next Game. None means quit."""
    choice = questionary.select("How do you want to play?", choices=[RANDOM, CHOOSE, SEED, QUIT]).ask()
    if choice == RANDOM:
        return Game.random()
    if choice == CHOOSE:
        answers = set(load_word_lists().answers)
        word = questionary.password(
            "Type the answer (it stays hidden):",
            validate=lambda w: w.strip().lower() in answers or "That word isn't on the Answer List",
        ).ask()
        return Game(word) if word else None
    if choice == SEED:
        seed = questionary.text("Seed number:", validate=lambda s: s.strip().isdigit() or "Type a whole number").ask()
        return Game.random(random.Random(int(seed))) if seed else None
    return None


def main() -> None:
    parser = argparse.ArgumentParser(prog="wordle", description="Play Wordle in the terminal.")
    parser.add_argument("--answer", help="play with this Answer instead of a random one")
    parser.add_argument("--seed", type=int, help="seed for picking a random Answer, to replay a Game")
    args = parser.parse_args()

    # --answer or --seed skip the menu for the first Game.
    if args.answer:
        game = Game(args.answer)
    elif args.seed is not None:
        game = Game.random(random.Random(args.seed))
    else:
        console.clear()
        game = ask_for_game()

    while game is not None:
        play(game)
        if not questionary.confirm("Play again?", default=True).ask():
            break
        game = ask_for_game()

    console.print("Thanks for playing! 👋")
