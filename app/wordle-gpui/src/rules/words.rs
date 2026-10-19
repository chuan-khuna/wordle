//! The Answer List and Guess List, built into the binary. `data/` is a copy of the Python game's lists.

use std::collections::HashSet;
use std::sync::OnceLock;

pub const WORD_LENGTH: usize = 5;

const ANSWERS: &str = include_str!("../../data/answers.txt");
const GUESSES: &str = include_str!("../../data/guesses.txt");

pub struct WordLists {
    /// The Answer List, sorted (so a Seed picks the same Answer as the Python game).
    pub answers: Vec<&'static str>,
    /// The Guess List. Contains every word in `answers`.
    pub guesses: HashSet<&'static str>,
}

fn read(text: &'static str) -> impl Iterator<Item = &'static str> {
    text.lines().map(str::trim).filter(|line| !line.is_empty())
}

pub fn word_lists() -> &'static WordLists {
    static LISTS: OnceLock<WordLists> = OnceLock::new();
    LISTS.get_or_init(|| {
        let mut answers: Vec<_> = read(ANSWERS).collect();
        answers.sort_unstable();
        let guesses = read(GUESSES).chain(answers.iter().copied()).collect();
        WordLists { answers, guesses }
    })
}
