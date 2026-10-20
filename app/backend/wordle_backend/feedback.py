"""Feedback: the five Marks for a Guess, and the Feedback Code that packs them."""

from collections import Counter

from wordle_backend.words import WORD_LENGTH

ABSENT, PRESENT, CORRECT = 0, 1, 2  # the Marks, as base-3 digits of a Feedback Code
WIN = 3**WORD_LENGTH - 1  # 242: every letter Correct

# One Mark per letter of the Guess, in order.
# Example: guess "crane" against answer "cable" gives (2, 0, 1, 0, 2).
type Feedback = tuple[int, ...]


def feedback(guess: str, answer: str) -> Feedback:
    """Mark each letter of `guess` against `answer`, using the official Wordle rules.

    Each letter of the Answer can only "pay for" one Mark, so two passes:
      1. A letter in exactly the right position is Correct.
      2. Going left to right, any other letter is Present if the Answer still
         has an unused copy of it, otherwise Absent.

    See docs/documents/feedback-scoring.md for worked examples.
    """
    if len(guess) != len(answer):
        raise ValueError(f"guess {guess!r} and answer {answer!r} have different lengths")

    letter_pairs = list(zip(guess, answer))
    marks = [CORRECT if g == a else ABSENT for g, a in letter_pairs]

    # The Answer's letters that pass 1 didn't use up.
    unused_answer_letters = Counter(a for g, a in letter_pairs if g != a)

    for position, guess_letter in enumerate(guess):
        if marks[position] == ABSENT and unused_answer_letters[guess_letter] > 0:
            marks[position] = PRESENT
            unused_answer_letters[guess_letter] -= 1

    return tuple(marks)


def pack(marks: Feedback) -> int:
    """The Feedback Code (0 to 242): the Marks read as base-3 digits, first letter first."""
    code = 0
    for mark in marks:
        code = code * 3 + mark
    return code


def unpack(code: int) -> Feedback:
    """The five Marks of a Feedback Code. The inverse of `pack`."""
    if not 0 <= code <= WIN:
        raise ValueError(f"Feedback Code {code} is not between 0 and {WIN}")
    marks = []
    for _ in range(WORD_LENGTH):
        code, mark = divmod(code, 3)
        marks.append(mark)
    return tuple(reversed(marks))
