from dataclasses import dataclass
from functools import cache
from importlib.resources import files

WORD_LENGTH = 5


@dataclass(frozen=True)
class WordLists:
    answers: tuple[str, ...]
    """The Answer List, sorted."""
    guesses: frozenset[str]
    """The Guess List. Contains every word in `answers`."""


def _read(name: str) -> list[str]:
    text = files("wordle").joinpath("data", name).read_text(encoding="utf-8")
    return [line.strip() for line in text.splitlines() if line.strip()]


@cache
def load_word_lists() -> WordLists:
    answers = tuple(sorted(_read("answers.txt")))
    guesses = frozenset(_read("guesses.txt")) | frozenset(answers)
    return WordLists(answers=answers, guesses=guesses)
