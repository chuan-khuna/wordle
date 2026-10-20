"""The Candidate Set: the Answers that fit every Feedback in a State."""

from dataclasses import dataclass

from wordle_backend.feedback import feedback, pack
from wordle_backend.words import load_word_lists


@dataclass(frozen=True)
class Turn:
    """One Guess and the Feedback Code it got."""

    guess: str
    feedback: int


type State = tuple[Turn, ...]


def candidates(state: State) -> tuple[str, ...]:
    """Every Answer that would have given each Turn's Feedback, in Answer List order.

    An empty State gives the whole Answer List.
    """
    remaining = load_word_lists().answers
    for turn in state:
        remaining = tuple(
            answer for answer in remaining if pack(feedback(turn.guess, answer)) == turn.feedback
        )
    return remaining
