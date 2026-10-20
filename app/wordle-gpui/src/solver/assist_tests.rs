use super::*;
use crate::engine::feedback::feedback;
use crate::solver::strategy::candidates;

fn typed(assist: &mut Assist, word: &str) {
    for letter in word.chars() {
        assist.press(&letter.to_string());
    }
}

fn entered(words: &[&str]) -> Assist {
    let mut assist = Assist::default();
    for word in words {
        typed(&mut assist, word);
        assert!(assist.press("enter"));
    }
    assist
}

#[test]
fn an_entered_guess_starts_all_absent() {
    let assist = entered(&["crane"]);
    assert_eq!(assist.guesses, [Guess { word: "crane".into(), feedback: vec![Mark::Absent; 5] }]);
    assert!(assist.typed.is_empty());
}

#[test]
fn a_click_cycles_absent_present_correct() {
    let mut assist = entered(&["crane"]);
    assist.cycle(0, 1);
    assert_eq!(assist.guesses[0].feedback[1], Mark::Present);
    assist.cycle(0, 1);
    assert_eq!(assist.guesses[0].feedback[1], Mark::Correct);
    assist.cycle(0, 1);
    assert_eq!(assist.guesses[0].feedback[1], Mark::Absent);
}

#[test]
fn a_word_off_the_guess_list_is_refused() {
    let mut assist = Assist::default();
    typed(&mut assist, "crxne");
    assert!(!assist.press("enter"));
    assert_eq!(assist.error, Some(Error::NotOnGuessList("crxne".into())));
    assert!(assist.guesses.is_empty());

    let mut short = Assist::default();
    typed(&mut short, "cra");
    short.press("enter");
    assert_eq!(short.error, Some(Error::WrongLength));
}

#[test]
fn backspace_with_nothing_typed_takes_the_last_guess_back() {
    let mut assist = entered(&["crane", "slate"]);
    assert!(assist.press("backspace"));
    assert_eq!(assist.typed, "slate");
    assert_eq!(assist.guesses.len(), 1);
}

#[test]
fn an_all_correct_guess_ends_the_typing() {
    let mut assist = entered(&["crane"]);
    for letter in 0..5 {
        assist.cycle(0, letter);
        assist.cycle(0, letter);
    }
    assert!(assist.is_solved());
    typed(&mut assist, "slate");
    assert!(assist.typed.is_empty());
}

#[test]
fn no_more_than_six_guesses() {
    let mut assist = entered(&["crane", "slate", "pious", "dumpy", "wight", "fjord"]);
    typed(&mut assist, "zebra");
    assert!(assist.typed.is_empty());
}

#[test]
fn clicked_in_feedback_narrows_the_candidates_like_a_played_game() {
    let mut assist = entered(&["crane"]);
    for (letter, mark) in feedback("crane", "cable").into_iter().enumerate() {
        while assist.guesses[0].feedback[letter] != mark {
            assist.cycle(0, letter);
        }
    }
    let state = assist.guesses.iter().map(|guess| (guess.word.as_str(), guess.feedback.as_slice()));
    let answers = &word_lists().answers;
    assert!(candidates(state).iter().any(|&index| answers[index] == "cable"));
}
