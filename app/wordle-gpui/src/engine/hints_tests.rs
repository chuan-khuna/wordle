use super::*;
use crate::engine::game::Game;

fn played(answer: &str, guesses: &[&str]) -> Vec<Guess> {
    let mut game = Game::new(answer, None).unwrap();
    for guess in guesses {
        game.guess(guess).unwrap();
    }
    game.guesses().to_vec()
}

#[test]
fn correct_beats_present_beats_absent() {
    let guesses = played("crane", &["eerie"]);
    assert_eq!(best_marks(&guesses)[&'e'], Mark::Correct);
    assert_eq!(best_marks(&guesses)[&'i'], Mark::Absent);
}

#[test]
fn a_letter_correct_in_this_spot_hints_correct() {
    let guesses = played("crane", &["trace"]);
    assert_eq!(live_hint(&guesses, 1, 'r'), Some(Mark::Correct));
}

#[test]
fn a_letter_in_the_answer_elsewhere_hints_present() {
    let guesses = played("crane", &["trace"]);
    assert_eq!(live_hint(&guesses, 0, 'r'), Some(Mark::Present));
    assert_eq!(live_hint(&guesses, 0, 'c'), Some(Mark::Present));
}

#[test]
fn absent_and_unseen_letters() {
    let guesses = played("crane", &["trace"]);
    assert_eq!(live_hint(&guesses, 0, 't'), Some(Mark::Absent));
    assert_eq!(live_hint(&guesses, 0, 'z'), None);
}
