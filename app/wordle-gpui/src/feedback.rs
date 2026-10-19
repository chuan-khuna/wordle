//! Work out the Feedback for a Guess: which letters are Correct, Present or Absent.
//! The same two-pass rule as `packages/wordle/src/wordle/feedback.py`.

use std::collections::HashMap;

/// The verdict on one letter of a Guess. Ordered so that Correct beats Present beats Absent.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Mark {
    /// The letter isn't in the Answer (or every copy of it is already used up).
    Absent,
    /// The letter is in the Answer, but at a different position.
    Present,
    /// The letter is in the Answer at this exact position.
    Correct,
}

/// One Mark per letter of the Guess, in order.
pub type Feedback = Vec<Mark>;

/// Mark each letter of `guess` against `answer`.
///
/// Each letter of the Answer can only "pay for" one Mark, so:
///   1. mark every letter in exactly the right position Correct;
///   2. going left to right, mark a leftover letter Present if the Answer
///      still has an unused copy of it, otherwise Absent.
pub fn feedback(guess: &str, answer: &str) -> Feedback {
    assert_eq!(guess.len(), answer.len(), "guess {guess:?} and answer {answer:?} have different lengths");
    let letter_pairs: Vec<(char, char)> = guess.chars().zip(answer.chars()).collect();

    // Pass 1: a letter in exactly the right position is Correct.
    let mut marks: Feedback = letter_pairs
        .iter()
        .map(|(g, a)| if g == a { Mark::Correct } else { Mark::Absent })
        .collect();

    // The Answer's letters that pass 1 didn't use up.
    let mut unused_answer_letters: HashMap<char, usize> = HashMap::new();
    for (g, a) in &letter_pairs {
        if g != a {
            *unused_answer_letters.entry(*a).or_default() += 1;
        }
    }

    // Pass 2: a non-Correct letter is Present if an unused copy is left.
    for (position, (g, _)) in letter_pairs.iter().enumerate() {
        if marks[position] == Mark::Absent {
            if let Some(count) = unused_answer_letters.get_mut(g).filter(|c| **c > 0) {
                marks[position] = Mark::Present;
                *count -= 1; // that copy is now used up
            }
        }
    }
    marks
}

#[cfg(test)]
mod tests {
    use super::Mark::*;
    use super::*;

    #[test]
    fn marks_correct_present_and_absent() {
        assert_eq!(feedback("crane", "cable"), vec![Correct, Absent, Present, Absent, Correct]);
    }

    #[test]
    fn a_repeated_letter_is_only_marked_as_often_as_it_appears() {
        assert_eq!(feedback("speed", "abide"), vec![Absent, Absent, Present, Absent, Present]);
    }

    #[test]
    fn correct_marks_are_given_out_first() {
        assert_eq!(feedback("eerie", "theme"), vec![Present, Absent, Absent, Absent, Correct]);
        assert_eq!(feedback("geese", "theme"), vec![Absent, Absent, Correct, Absent, Correct]);
    }
}
