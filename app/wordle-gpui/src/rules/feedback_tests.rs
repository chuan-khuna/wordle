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
