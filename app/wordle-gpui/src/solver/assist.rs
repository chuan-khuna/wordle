//! Solver mode: a State the player copies in from a Wordle game played somewhere else. Each Guess
//! is typed in, then its tiles are clicked until they show the Feedback that game gave, so the
//! Solver can suggest the next Guess. There is no Answer, so the Feedback is never worked out here.

use crate::engine::feedback::Mark;
use crate::engine::game::{Error, Guess, MAX_GUESSES};
use crate::engine::words::{WORD_LENGTH, word_lists};

#[derive(Default)]
pub struct Assist {
    /// The State: each Guess entered, with the Feedback clicked in so far (Absent until clicked).
    pub guesses: Vec<Guess>,
    /// The letters of the Guess being typed, not yet entered.
    pub typed: String,
    /// Why the last Enter was refused, until the next key.
    pub error: Option<Error>,
}

/// The Mark a click on a tile moves to: Absent, then Present, then Correct, then Absent again.
pub fn next_mark(mark: Mark) -> Mark {
    match mark {
        Mark::Absent => Mark::Present,
        Mark::Present => Mark::Correct,
        Mark::Correct => Mark::Absent,
    }
}

impl Assist {
    /// Whether the last Guess is all Correct: the other game was won, so nothing more can be entered.
    pub fn is_solved(&self) -> bool {
        self.guesses.last().is_some_and(Guess::is_win)
    }

    /// Whether another Guess can be typed: the game isn't solved and has Guesses left.
    pub fn can_type(&self) -> bool {
        !self.is_solved() && self.guesses.len() < MAX_GUESSES
    }

    /// Letters, Enter (enter the typed Guess, all Absent) and Backspace. Backspace with nothing
    /// typed takes the last Guess back off the board to be edited. Returns whether the State changed.
    pub fn press(&mut self, key: &str) -> bool {
        self.error = None;
        match key {
            "enter" if self.can_type() => {
                let word = self.typed.clone();
                if word.len() != WORD_LENGTH {
                    self.error = Some(Error::WrongLength);
                    return false;
                }
                if !word_lists().guesses.contains(word.as_str()) {
                    self.error = Some(Error::NotOnGuessList(word));
                    return false;
                }
                self.guesses.push(Guess { word, feedback: vec![Mark::Absent; WORD_LENGTH] });
                self.typed.clear();
                true
            }
            "backspace" if self.typed.is_empty() => match self.guesses.pop() {
                Some(guess) => {
                    self.typed = guess.word;
                    true
                }
                None => false,
            },
            "backspace" => {
                self.typed.pop();
                false
            }
            _ => {
                let mut letters = key.chars();
                if let (Some(letter), None) = (letters.next(), letters.next())
                    && letter.is_ascii_alphabetic()
                    && self.can_type()
                    && self.typed.len() < WORD_LENGTH
                {
                    self.typed.push(letter.to_ascii_lowercase());
                }
                false
            }
        }
    }

    /// Put `word` in as the Guess being typed, as the Solver's "Type it" does.
    pub fn type_word(&mut self, word: &str) {
        if self.can_type() {
            self.typed = word.to_string();
            self.error = None;
        }
    }

    /// Move the tile at `letter` of Guess `row` on to its next Mark.
    pub fn cycle(&mut self, row: usize, letter: usize) {
        if let Some(mark) = self.guesses.get_mut(row).and_then(|guess| guess.feedback.get_mut(letter)) {
            *mark = next_mark(*mark);
        }
    }
}

#[cfg(test)]
#[path = "assist_tests.rs"]
mod tests;
