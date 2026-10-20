"""The Answer List and Guess List, read from the copies in `data/`."""

from dataclasses import dataclass
from functools import cache
from pathlib import Path

WORD_LENGTH = 5
DATA_DIR = Path(__file__).resolve().parent / "data"


@dataclass(frozen=True)
class WordLists:
    answers: tuple[str, ...]
    """The Answer List, sorted."""
    guesses: tuple[str, ...]
    """The Guess List, sorted. Contains every word in `answers`."""


def _read(name: str) -> list[str]:
    text = (DATA_DIR / name).read_text(encoding="utf-8")
    return [line.strip() for line in text.splitlines() if line.strip()]


@cache
def load_word_lists() -> WordLists:
    answers = tuple(sorted(_read("answers.txt")))
    guesses = tuple(sorted(set(_read("guesses.txt")) | set(answers)))
    return WordLists(answers=answers, guesses=guesses)
