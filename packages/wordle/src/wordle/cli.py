import argparse
import random

from wordle.game import MAX_GUESSES, Game, InvalidGuess


def main() -> None:
    parser = argparse.ArgumentParser(prog="wordle", description="Play Wordle in the terminal.")
    parser.add_argument("--answer", help="play with this Answer instead of a random one")
    parser.add_argument("--seed", type=int, help="seed for picking a random Answer, to replay a Game")
    args = parser.parse_args()

    game = Game(args.answer) if args.answer else Game.random(random.Random(args.seed))

    while not game.is_over:
        try:
            word = input(f"Guess ({game.guesses_left} left): ")
        except (EOFError, KeyboardInterrupt):
            print(f"\nThe answer was {game.answer.upper()}.")
            return
        try:
            guess = game.guess(word)
        except InvalidGuess as e:
            print(e)
            continue
        print(guess)

    if game.is_won:
        print(f"You won in {len(game.state)}/{MAX_GUESSES}!")
    else:
        print(f"You lost. The answer was {game.answer.upper()}.")
