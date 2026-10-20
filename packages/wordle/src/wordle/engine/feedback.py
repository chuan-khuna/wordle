"""Work out the Feedback for a Guess: which letters are Correct, Present or Absent."""

from collections import Counter
from enum import Enum


class Mark(Enum):
    """The verdict on one letter of a Guess."""

    ABSENT = 0  # the letter isn't in the Answer (or every copy of it is already used up)
    PRESENT = 1  # the letter is in the Answer, but at a different position
    CORRECT = 2  # the letter is in the Answer at this exact position


# One Mark per letter of the Guess, in order.
# Example: guess "crane" against answer "cable" gives
# (CORRECT, ABSENT, PRESENT, ABSENT, CORRECT).
type Feedback = tuple[Mark, ...]


def feedback(guess: str, answer: str) -> Feedback:
    """Mark each letter of `guess` against `answer`, using the official Wordle rules.

    The tricky part is repeated letters. Each letter of the Answer can only
    "pay for" one Mark. So if the Answer has one E and the Guess has two,
    only one of the Guess's E's can be Correct or Present; the other is Absent.

    We do two passes over the Guess:
      1. Mark every letter that is in exactly the right position as Correct.
      2. For the letters left over, mark them Present if the Answer still has
         an unused copy of that letter, otherwise Absent.

    Example: guess "speed" against answer "abide"
      - Pass 1: no letter is in the right position.
      - Pass 2: the Answer's leftover letters are a, b, i, d, e (one E).
          s -> Absent, p -> Absent,
          e -> Present (uses up the only E),
          e -> Absent  (no E left),
          d -> Present.
    """
    if len(guess) != len(answer):
        raise ValueError(f"guess {guess!r} and answer {answer!r} have different lengths")

    # Pair up the letters at each position: "speed" vs "abide" gives
    # ("s", "a"), ("p", "b"), ("e", "i"), ("e", "d"), ("d", "e").
    letter_pairs = list(zip(guess, answer))

    # Pass 1: a letter in exactly the right position is Correct.
    # Everything else starts as Absent; pass 2 may upgrade it to Present.
    marks = [
        Mark.CORRECT if guess_letter == answer_letter else Mark.ABSENT
        for guess_letter, answer_letter in letter_pairs
    ]

    # Count the Answer's letters that pass 1 didn't use up.
    # For "speed" vs "abide" nothing was Correct, so this is
    # {"a": 1, "b": 1, "i": 1, "d": 1, "e": 1}.
    unused_answer_letters = Counter(
        answer_letter
        for guess_letter, answer_letter in letter_pairs
        if guess_letter != answer_letter
    )

    # Pass 2: going left to right, a non-Correct letter is Present
    # if the Answer still has an unused copy of it.
    for position, guess_letter in enumerate(guess):
        if marks[position] is Mark.ABSENT and unused_answer_letters[guess_letter] > 0:
            marks[position] = Mark.PRESENT
            unused_answer_letters[guess_letter] -= 1  # that copy is now used up

    return tuple(marks)
