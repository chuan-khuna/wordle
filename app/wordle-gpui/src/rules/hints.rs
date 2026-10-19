//! What earlier Guesses already say about letters: the keyboard's colours, and the live hints
//! on the Guess being typed.

use std::collections::HashMap;

use super::feedback::Mark;
use super::game::Guess;

/// What each guessed letter is known to be. Correct beats Present beats Absent.
pub fn best_marks(guesses: &[Guess]) -> HashMap<char, Mark> {
    let mut known = HashMap::new();
    for guess in guesses {
        for (letter, mark) in guess.word.chars().zip(&guess.feedback) {
            let best = known.entry(letter).or_insert(*mark);
            *best = (*best).max(*mark);
        }
    }
    known
}

/// What earlier Guesses say about typing `letter` at `position`, before it's submitted:
/// Correct if a Guess had it Correct in that spot, Present if it's known to be in the Answer
/// (but not known to be in that spot), Absent if it's known not to be, `None` if no Guess had it.
pub fn live_hint(guesses: &[Guess], position: usize, letter: char) -> Option<Mark> {
    let correct_here = guesses.iter().any(|guess| guess.word.chars().nth(position) == Some(letter) && guess.feedback[position] == Mark::Correct);
    if correct_here {
        return Some(Mark::Correct);
    }
    best_marks(guesses).get(&letter).map(|mark| match mark {
        Mark::Absent => Mark::Absent,
        _ => Mark::Present,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rules::game::Game;

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
}
