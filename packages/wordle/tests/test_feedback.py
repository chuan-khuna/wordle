import pytest

from wordle.feedback import Mark, feedback

C, P, A = Mark.CORRECT, Mark.PRESENT, Mark.ABSENT


@pytest.mark.parametrize(
    ("guess", "answer", "expected"),
    [
        ("crane", "crane", (C, C, C, C, C)),
        ("fight", "crane", (A, A, A, A, A)),
        ("nacre", "crane", (P, P, P, P, C)),
        # A repeated letter is Present only as often as it is in the Answer.
        ("speed", "abide", (A, A, P, A, P)),
        ("eerie", "crane", (A, A, P, A, C)),
        # Correct Marks are given out before Present ones.
        ("lllll", "hello", (A, A, C, C, A)),
        ("bbaaa", "aabbb", (P, P, P, P, A)),
    ],
)
def test_feedback(guess, answer, expected):
    assert feedback(guess, answer) == expected


def test_feedback_rejects_different_lengths():
    with pytest.raises(ValueError):
        feedback("cranes", "crane")
