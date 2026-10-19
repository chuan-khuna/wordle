from collections import Counter
from enum import Enum


class Mark(Enum):
    ABSENT = 0
    PRESENT = 1
    CORRECT = 2


type Feedback = tuple[Mark, ...]


def feedback(guess: str, answer: str) -> Feedback:
    """Mark each letter of `guess` against `answer`.

    Correct Marks are given out first. A repeated letter is then marked Present
    only as many times as it is still unaccounted for in the Answer.
    """
    if len(guess) != len(answer):
        raise ValueError(f"guess {guess!r} and answer {answer!r} differ in length")

    marks = [Mark.CORRECT if g == a else Mark.ABSENT for g, a in zip(guess, answer)]
    unmatched = Counter(a for g, a in zip(guess, answer) if g != a)
    for i, letter in enumerate(guess):
        if marks[i] is Mark.ABSENT and unmatched[letter] > 0:
            marks[i] = Mark.PRESENT
            unmatched[letter] -= 1
    return tuple(marks)
