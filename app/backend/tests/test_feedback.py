import pytest

from wordle_backend.feedback import WIN, feedback, pack, unpack

A, P, C = 0, 1, 2


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


def test_pack_reads_marks_as_base_3_digits():
    assert pack((A, A, A, A, A)) == 0
    assert pack((C, C, C, C, C)) == WIN == 242
    assert pack((A, A, P, A, P)) == 1 * 9 + 1


def test_unpack_inverts_pack():
    for code in range(WIN + 1):
        assert pack(unpack(code)) == code


def test_unpack_rejects_out_of_range():
    with pytest.raises(ValueError):
        unpack(243)
