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
#[path = "hints_tests.rs"]
mod tests;
