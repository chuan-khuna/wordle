//! The rules of a Game: the Guess Limit, which words are allowed, Win and Loss.
//! Mirrors `packages/wordle/src/wordle/game.py`.

use std::fmt;

use crate::feedback::{Feedback, Mark, feedback};
use crate::seed::choose_index;
use crate::words::{WORD_LENGTH, word_lists};

pub const MAX_GUESSES: usize = 6;
pub const MAX_SEED: u32 = 999_999;

/// Why a Guess was refused, or why a Game couldn't start. A refused Guess doesn't use up a Guess.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Error {
    WrongLength,
    NotOnGuessList(String),
    NotOnAnswerList(String),
    GameOver,
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Error::WrongLength => write!(f, "A Guess must have {WORD_LENGTH} letters"),
            Error::NotOnGuessList(word) => write!(f, "{} is not on the Guess List", word.to_uppercase()),
            Error::NotOnAnswerList(word) => write!(f, "{} is not on the Answer List", word.to_uppercase()),
            Error::GameOver => write!(f, "The Game is already over"),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Guess {
    pub word: String,
    pub feedback: Feedback,
}

impl Guess {
    pub fn is_win(&self) -> bool {
        self.feedback.iter().all(|mark| *mark == Mark::Correct)
    }
}

#[derive(Debug, Clone)]
pub struct Game {
    answer: String,
    /// The Guess Limit. None means unlimited: the Game only ends with a Win.
    pub max_guesses: Option<usize>,
    /// The Seed that picked this Answer, if it was picked at random.
    pub seed: Option<u32>,
    /// The State: every Guess so far, in order.
    guesses: Vec<Guess>,
}

impl Game {
    pub fn new(answer: &str, max_guesses: Option<usize>) -> Result<Self, Error> {
        let answer = answer.trim().to_lowercase();
        if !word_lists().answers.contains(&answer.as_str()) {
            return Err(Error::NotOnAnswerList(answer));
        }
        Ok(Self { answer, max_guesses, seed: None, guesses: Vec::new() })
    }

    /// A Game whose Answer is picked by `seed`, the same one the Python game picks.
    pub fn random(seed: u32, max_guesses: Option<usize>) -> Self {
        let answers = &word_lists().answers;
        let answer = answers[choose_index(seed, answers.len())];
        Self { answer: answer.to_string(), max_guesses, seed: Some(seed), guesses: Vec::new() }
    }

    /// The same Game from the start: the same Answer, Seed and Guess Limit, with no Guesses.
    pub fn restart(&self) -> Self {
        Self { guesses: Vec::new(), ..self.clone() }
    }

    pub fn answer(&self) -> &str {
        &self.answer
    }

    pub fn guesses(&self) -> &[Guess] {
        &self.guesses
    }

    pub fn is_unlimited(&self) -> bool {
        self.max_guesses.is_none()
    }

    /// How many Guesses are left, or None if the Game has no Guess Limit.
    pub fn guesses_left(&self) -> Option<usize> {
        self.max_guesses.map(|max| max - self.guesses.len())
    }

    pub fn is_won(&self) -> bool {
        self.guesses.last().is_some_and(Guess::is_win)
    }

    pub fn is_lost(&self) -> bool {
        !self.is_won() && self.guesses_left() == Some(0)
    }

    pub fn is_over(&self) -> bool {
        self.is_won() || self.is_lost()
    }

    /// `word` tidied up (trimmed, lowercase), or the reason the Game would refuse it.
    pub fn check_guess(&self, word: &str) -> Result<String, Error> {
        let word = word.trim().to_lowercase();
        if word.chars().count() != WORD_LENGTH {
            return Err(Error::WrongLength);
        }
        if !word_lists().guesses.contains(word.as_str()) {
            return Err(Error::NotOnGuessList(word));
        }
        Ok(word)
    }

    pub fn guess(&mut self, word: &str) -> Result<&Guess, Error> {
        if self.is_over() {
            return Err(Error::GameOver);
        }
        let word = self.check_guess(word)?;
        let feedback = feedback(&word, &self.answer);
        self.guesses.push(Guess { word, feedback });
        Ok(self.guesses.last().unwrap())
    }

    /// The emoji grid people paste into chats, like the real Wordle's Share button.
    pub fn share_grid(&self) -> String {
        let score = if self.is_won() { self.guesses.len().to_string() } else { "X".into() };
        let limit = self.max_guesses.map_or("∞".into(), |max| max.to_string());
        let rows: Vec<String> = self
            .guesses
            .iter()
            .map(|guess| {
                guess
                    .feedback
                    .iter()
                    .map(|mark| match mark {
                        Mark::Correct => '🟩',
                        Mark::Present => '🟨',
                        Mark::Absent => '⬛',
                    })
                    .collect()
            })
            .collect();
        format!("Wordle {score}/{limit}\n\n{}", rows.join("\n"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn seeds_pick_the_same_answers_as_the_python_game() {
        // uv run python -c "from wordle.game import Game; print(Game.random(7).answer)"
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
}
