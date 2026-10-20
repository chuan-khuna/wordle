use super::*;
use crate::theme::{CATPPUCCIN_LATTE, CATPPUCCIN_MOCHA, ROSE_PINE, THEMES};

#[test]
fn opens_on_the_current_theme() {
    assert_eq!(ThemePicker::new(&CATPPUCCIN_MOCHA).selected, 1);
}

#[test]
fn typing_filters_and_previews_the_first_match() {
    let mut picker = ThemePicker::new(&ROSE_PINE);
    for letter in "latt".chars() {
        picker.press(&letter.to_string(), Some(&letter.to_string()));
    }
    assert_eq!(picker.press("e", Some("e")), Outcome::Preview(&CATPPUCCIN_LATTE));
}

#[test]
fn up_and_down_move_through_the_matches_and_wrap() {
    let mut picker = ThemePicker::new(&ROSE_PINE);
    assert_eq!(picker.press("down", None), Outcome::Preview(&CATPPUCCIN_MOCHA));
    picker.press("up", None);
    assert_eq!(picker.press("up", None), Outcome::Preview(THEMES.last().unwrap()));
}

#[test]
fn escape_cancels_and_enter_confirms() {
    let mut picker = ThemePicker::new(&ROSE_PINE);
    assert_eq!(picker.press("escape", None), Outcome::Cancel);
    assert_eq!(picker.press("enter", None), Outcome::Confirm);
}

#[test]
fn a_query_with_no_matches_previews_nothing() {
    let mut picker = ThemePicker::new(&ROSE_PINE);
    assert_eq!(picker.press("z", Some("z")), Outcome::None);
    assert_eq!(picker.press("down", Some("")), Outcome::None);
}
