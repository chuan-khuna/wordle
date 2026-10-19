import random

import pytest

from wordle.feedback import Mark
from wordle.game import MAX_GUESSES, Game, GameOver, InvalidGuess
from wordle.words import load_word_lists


def test_word_lists():
    lists = load_word_lists()
    assert len(lists.answers) == 2315
    assert len(lists.guesses) == 14855
    assert set(lists.answers) <= lists.guesses


def test_win():
    game = Game("crane")
    game.guess("slate")
    assert not game.is_over
    guess = game.guess("crane")
    assert guess.feedback == (Mark.CORRECT,) * 5
    assert guess.number == 2
    assert game.is_won and game.is_over
    assert [g.word for g in game.state] == ["slate", "crane"]


def test_loss_after_six_guesses():
    game = Game("crane")
    for _ in range(MAX_GUESSES):
        game.guess("fight")
    assert game.is_lost and not game.is_won
    with pytest.raises(GameOver):
        game.guess("crane")


def test_guess_after_win_is_refused():
    game = Game("crane")
    game.guess("crane")
    with pytest.raises(GameOver):
        game.guess("slate")


@pytest.mark.parametrize("word", ["cran", "cranes", "zzzzz"])
def test_invalid_guess_does_not_use_a_guess(word):
    game = Game("crane")
    with pytest.raises(InvalidGuess):
        game.guess(word)
    assert game.guesses_left == MAX_GUESSES
    assert len(game.state) == 0


def test_guess_is_normalised():
    game = Game("crane")
    game.guess("  CRANE ")
    assert game.is_won


def test_answer_must_be_on_answer_list():
    with pytest.raises(ValueError):
        Game("aahed")  # on the Guess List only


def test_random_game_is_reproducible_with_a_seed():
    assert Game.random(random.Random(42)).answer == Game.random(random.Random(42)).answer


def test_state_is_a_snapshot():
    game = Game("crane")
    game.guess("slate")
    before = game.state
    game.guess("crane")
    assert len(before) == 1 and len(game.state) == 2


def test_state_renders_one_line_per_guess():
    game = Game("crane")
    game.guess("slate")
    game.guess("crane")
    lines = game.state.render().splitlines()
    assert len(lines) == 2
    assert all(f" {letter} " in lines[1] for letter in "CRANE")
    assert str(game.state.last) == game.state.last.render()
