use super::*;

#[test]
fn seeds_pick_the_same_answers_as_the_python_game() {
    // uv run python -c "from wordle.engine.game import Game; print(Game.random(7).answer)"
    for (seed, answer) in [(0, "rerun"), (7, "octet"), (42, "craft"), (999_999, "glade")] {
        assert_eq!(Game::random(seed, Some(MAX_GUESSES)).answer(), answer);
    }
}

#[test]
fn refused_guesses_dont_use_up_a_guess() {
    let mut game = Game::new("crane", Some(MAX_GUESSES)).unwrap();
    assert_eq!(game.guess("abc"), Err(Error::WrongLength));
    assert_eq!(game.guess("zzzzz"), Err(Error::NotOnGuessList("zzzzz".into())));
    assert_eq!(game.guesses_left(), Some(6));
}

#[test]
fn a_correct_guess_wins_and_ends_the_game() {
    let mut game = Game::new("Crane ", Some(MAX_GUESSES)).unwrap();
    game.guess("slate").unwrap();
    game.guess("CRANE").unwrap();
    assert!(game.is_won() && game.is_over());
    assert_eq!(game.guess("crane"), Err(Error::GameOver));
    assert_eq!(game.share_grid(), "Wordle 2/6\n\n⬛⬛🟩⬛🟩\n🟩🟩🟩🟩🟩");
}

#[test]
fn the_guess_limit_ends_a_game_in_a_loss() {
    let mut game = Game::new("crane", Some(2)).unwrap();
    game.guess("slate").unwrap();
    game.guess("slate").unwrap();
    assert!(game.is_lost());
}

#[test]
fn an_unlimited_game_is_never_lost() {
    let mut game = Game::new("crane", None).unwrap();
    for _ in 0..10 {
        game.guess("slate").unwrap();
    }
    assert!(!game.is_over());
    assert_eq!(game.guesses_left(), None);
}

#[test]
fn restarting_keeps_the_answer_and_seed_but_clears_the_guesses() {
    let mut game = Game::random(7, None);
    game.guess("octet").unwrap();
    let restarted = game.restart();
    assert_eq!((restarted.answer(), restarted.seed, restarted.max_guesses), ("octet", Some(7), None));
    assert!(restarted.guesses().is_empty() && !restarted.is_over());
}

#[test]
fn the_answer_must_be_on_the_answer_list() {
    assert!(matches!(Game::new("zzzzz", None), Err(Error::NotOnAnswerList(_))));
}
