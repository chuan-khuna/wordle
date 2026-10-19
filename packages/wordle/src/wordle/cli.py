"""The terminal game: menus with questionary, the board and keyboard drawn with rich."""

import argparse

import questionary
from rich.align import Align
from rich.console import Console, Group
from rich.panel import Panel
from rich.text import Text

from wordle.feedback import Mark
from wordle.game import MAX_GUESSES, MAX_SEED, Game, InvalidGuess, State
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
CHEERS = ["Genius!", "Magnificent!", "Impressive!", "Splendid!", "Great!", "Phew!"]

RANDOM, CHOOSE, SEED, QUIT = "🎲 Random word", "🤫 Choose the word (for a friend)", "🔁 Replay with a seed", "👋 Quit"
CLASSIC, UNLIMITED = f"🟩 Classic: {MAX_GUESSES} guesses", "♾️  Unlimited guesses (practice)"


def draw_board(game: Game) -> Text:
    """The Guesses so far, then empty rows: up to the Guess Limit, or just one in an unlimited Game."""
    board = Text()
    for guess in game.state:
        for letter, mark in zip(guess.word, guess.feedback):
            board.append(f" {letter.upper()} ", style=TILE_STYLES[mark])
            board.append(" ")
        board.append("\n\n")

    if game.is_unlimited:
        empty_rows = 0 if game.is_won else 1
    else:
        empty_rows = game.guesses_left
    for _ in range(empty_rows):
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


def status_line(game: Game) -> str:
    """Shown under the board: Guesses left (or the Guess count when unlimited), and the Seed."""
    if game.is_unlimited:
        parts = [f"guess {len(game.state)} · no limit"]
    else:
        parts = [f"{game.guesses_left} guesses left"]
    if game.seed is not None:
        parts.append(f"seed {game.seed}")
    return " · ".join(parts)


def show(game: Game, message: str = "") -> None:
    console.clear()
    screen = Group(
        Align.center(draw_board(game)),
        Align.center(draw_keyboard(game.state)),
        Align.center(Text(message, style="bold")),
    )
    console.print(Panel(screen, title="[bold]W O R D L E[/]", subtitle=status_line(game), width=48))


def share_grid(game: Game) -> str:
    """The emoji grid people paste into chats, like the real Wordle's Share button."""
    score = len(game.state) if game.is_won else "X"
    limit = "∞" if game.is_unlimited else game.max_guesses
    rows = ["".join(SHARE_SQUARES[mark] for mark in guess.feedback) for guess in game.state]
    return f"Wordle {score}/{limit}\n\n" + "\n".join(rows)


def replay_hint(game: Game) -> str:
    """The command that plays this same Answer again."""
    pick = f"--seed {game.seed}" if game.seed is not None else f"--answer {game.answer}"
    unlimited = " --unlimited" if game.is_unlimited else ""
    return f"Replay: uv run src/main.py {pick}{unlimited}"


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
            console.print(replay_hint(game), style="dim")
            return
        game.guess(word)
        show(game)

    if game.is_won:
        guesses = len(game.state)
        cheer = CHEERS[guesses - 1] if guesses <= len(CHEERS) else "Got there!"
        show(game, f"🎉 {cheer}")
    else:
        show(game, f"😵 The answer was {game.answer.upper()}")
    console.print(share_grid(game))
    console.print(replay_hint(game), style="dim")


def ask_for_guess_limit() -> int | None | bool:
    """Classic six Guesses or unlimited. False means the player cancelled."""
    choice = questionary.select("How many guesses?", choices=[CLASSIC, UNLIMITED]).ask()
    if choice is None:
        return False
    return None if choice == UNLIMITED else MAX_GUESSES


def ask_for_game() -> Game | None:
    """Ask how to pick the Answer for the next Game. None means quit."""
    choice = questionary.select("How do you want to play?", choices=[RANDOM, CHOOSE, SEED, QUIT]).ask()
    if choice in (None, QUIT):
        return None

    answer = seed = None
    if choice == CHOOSE:
        answers = set(load_word_lists().answers)
        answer = questionary.password(
            "Type the answer (it stays hidden):",
            validate=lambda w: w.strip().lower() in answers or "That word isn't on the Answer List",
        ).ask()
        if answer is None:
            return None
    elif choice == SEED:
        text = questionary.text(
            "Seed number:",
            validate=lambda s: (s.strip().isdigit() and int(s) <= MAX_SEED) or f"Type a whole number from 0 to {MAX_SEED}",
        ).ask()
        if text is None:
            return None
        seed = int(text)

    max_guesses = ask_for_guess_limit()
    if max_guesses is False:
        return None
    if answer is not None:
        return Game(answer, max_guesses=max_guesses)
    return Game.random(seed, max_guesses=max_guesses)


def main() -> None:
    parser = argparse.ArgumentParser(prog="wordle", description="Play Wordle in the terminal.")
    parser.add_argument("--answer", help="play with this Answer instead of a random one")
    parser.add_argument("--seed", type=int, help="replay the Answer picked by this seed (shown during every game)")
    parser.add_argument("--unlimited", action="store_true", help="no Guess Limit: keep guessing until you win")
    args = parser.parse_args()

    max_guesses = None if args.unlimited else MAX_GUESSES
    # --answer or --seed skip the menu for the first Game.
    if args.answer:
        game = Game(args.answer, max_guesses=max_guesses)
    elif args.seed is not None:
        game = Game.random(args.seed, max_guesses=max_guesses)
    else:
        console.clear()
        game = ask_for_game()

    while game is not None:
        play(game)
        if not questionary.confirm("Play again?", default=True).ask():
            break
        game = ask_for_game()

    console.print("Thanks for playing! 👋")
