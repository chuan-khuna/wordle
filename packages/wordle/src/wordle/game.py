import random
from collections.abc import Iterator
from dataclasses import dataclass, field

from wordle.feedback import Feedback, Mark, feedback
from wordle.words import WORD_LENGTH, WordLists, load_word_lists

MAX_GUESSES = 6


class InvalidGuess(ValueError):
    """A Guess the game refuses. It doesn't use up one of the six Guesses."""


class GameOver(Exception):
    """A Guess made after the Game has ended in a Win or a Loss."""


COLOURS = {
    Mark.CORRECT: "\033[1;30;42m",  # green
    Mark.PRESENT: "\033[1;30;43m",  # yellow
    Mark.ABSENT: "\033[1;37;100m",  # grey
}
RESET = "\033[0m"


@dataclass(frozen=True)
class Guess:
    number: int
    """Which Guess of the Game this is, from 1 to 6."""
    word: str
    feedback: Feedback

    @property
    def is_win(self) -> bool:
        return all(mark is Mark.CORRECT for mark in self.feedback)

    def render(self) -> str:
        """The word with each letter coloured by its Mark, for the terminal."""
        return "".join(f"{COLOURS[mark]} {letter.upper()} {RESET}" for letter, mark in zip(self.word, self.feedback))

    __str__ = render


@dataclass(frozen=True)
class State:
    guesses: tuple[Guess, ...] = ()

    def __len__(self) -> int:
        return len(self.guesses)

    def __iter__(self) -> Iterator[Guess]:
        return iter(self.guesses)

    @property
    def last(self) -> Guess | None:
        return self.guesses[-1] if self.guesses else None

    def add(self, word: str, feedback: Feedback) -> "State":
        return State(self.guesses + (Guess(len(self.guesses) + 1, word, feedback),))

    def render(self) -> str:
        """Every Guess so far, one per line, like the board on screen."""
        return "\n".join(guess.render() for guess in self.guesses)

    __str__ = render


@dataclass
class Game:
    answer: str
    word_lists: WordLists = field(default_factory=load_word_lists, repr=False)
    _state: State = field(default_factory=State, init=False)

    def __post_init__(self) -> None:
        self.answer = self.answer.strip().lower()
        if self.answer not in self.word_lists.answers:
            raise ValueError(f"{self.answer!r} is not on the Answer List")

    @classmethod
    def random(cls, rng: random.Random | None = None, word_lists: WordLists | None = None) -> "Game":
        word_lists = word_lists or load_word_lists()
        answer = (rng or random.Random()).choice(word_lists.answers)
        return cls(answer, word_lists)

    @property
    def state(self) -> State:
        return self._state

    @property
    def guesses_left(self) -> int:
        return MAX_GUESSES - len(self._state)

    @property
    def is_won(self) -> bool:
        return self._state.last is not None and self._state.last.is_win

    @property
    def is_lost(self) -> bool:
        return not self.is_won and self.guesses_left == 0

    @property
    def is_over(self) -> bool:
        return self.is_won or self.is_lost

    def check_guess(self, word: str) -> str:
        """Return `word` tidied up (trimmed, lowercase), or raise InvalidGuess if the game would refuse it."""
        word = word.strip().lower()
        if len(word) != WORD_LENGTH:
            raise InvalidGuess(f"a Guess must have {WORD_LENGTH} letters")
        if word not in self.word_lists.guesses:
            raise InvalidGuess(f"{word!r} is not on the Guess List")
        return word

    def guess(self, word: str) -> Guess:
        if self.is_over:
            raise GameOver("the Game is already over")
        word = self.check_guess(word)
        self._state = self._state.add(word, feedback(word, self.answer))
        return self._state.last
