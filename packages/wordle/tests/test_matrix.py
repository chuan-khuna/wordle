import random

from wordle.engine.feedback import feedback
from wordle.engine.words import load_word_lists
from wordle.solver.matrix import WIN, score_matrix


def pack(marks) -> int:
    code = 0
    for mark in marks:
        code = code * 3 + mark.value
    return code


def test_matches_feedback_on_tricky_words():
    words = ("speed", "abide", "lllll", "hello", "eerie", "crane", "bbaaa", "aabbb", "cable")
    matrix = score_matrix(words, words)
    for g, guess in enumerate(words):
        for a, answer in enumerate(words):
            assert matrix[g, a] == pack(feedback(guess, answer)), (guess, answer)


def test_matches_feedback_on_random_pairs():
    lists = load_word_lists()
    rng = random.Random(0)
    guesses = tuple(rng.sample(sorted(lists.guesses), 300))
    answers = tuple(rng.sample(lists.answers, 300))
    matrix = score_matrix(guesses, answers)
    for g, guess in enumerate(guesses):
        for a, answer in enumerate(answers):
            assert matrix[g, a] == pack(feedback(guess, answer))


def test_a_word_against_itself_is_a_win():
    answers = load_word_lists().answers[:50]
    matrix = score_matrix(answers, answers)
    assert all(matrix[i, i] == WIN for i in range(len(answers)))


def test_threads_give_the_same_matrix():
    lists = load_word_lists()
    guesses = tuple(sorted(lists.guesses))[:700]  # several chunks
    answers = lists.answers[:100]
    assert (score_matrix(guesses, answers, threads=4) == score_matrix(guesses, answers)).all()
