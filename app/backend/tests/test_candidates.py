from wordle_backend.candidates import Turn, candidates
from wordle_backend.feedback import feedback, pack
from wordle_backend.words import load_word_lists


def test_word_lists():
    lists = load_word_lists()
    assert len(lists.answers) == 2315
    assert set(lists.answers) <= set(lists.guesses)
    assert lists.answers == tuple(sorted(lists.answers))


def test_empty_state_is_the_whole_answer_list():
    assert candidates(()) == load_word_lists().answers


def test_candidates_shrink_and_keep_the_answer():
    answer = "crane"
    state = ()
    sizes = [len(candidates(state))]
    for guess in ("slate", "pound", "crick"):
        state += (Turn(guess, pack(feedback(guess, answer))),)
        found = candidates(state)
        assert answer in found
        sizes.append(len(found))
    assert sizes == sorted(sizes, reverse=True) and sizes[-1] < sizes[0]


def test_repeated_letter_feedback_filters_correctly():
    # SPEED against ABIDE: the second E is Absent, so exactly one E remains.
    found = candidates((Turn("speed", pack(feedback("speed", "abide"))),))
    assert "abide" in found
    assert all(feedback("speed", word) == feedback("speed", "abide") for word in found)


def test_winning_feedback_leaves_one_candidate():
    assert candidates((Turn("crane", 242),)) == ("crane",)
