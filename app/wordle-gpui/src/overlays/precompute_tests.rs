use super::*;

fn picker_on(index: usize) -> ThreadPicker {
    ThreadPicker { selected: index }
}

#[test]
fn enter_runs_with_the_highlighted_thread_count() {
    assert_eq!(picker_on(0).press("enter"), Outcome::Run(1));
    assert_eq!(picker_on(3).press("enter"), Outcome::Run(8));
}

#[test]
fn up_and_down_wrap_around() {
    let mut picker = picker_on(3);
    picker.press("down");
    assert_eq!(picker.threads(), 1);
    picker.press("up");
    assert_eq!(picker.threads(), 8);
}

#[test]
fn typing_a_thread_count_jumps_to_it() {
    let mut picker = picker_on(0);
    picker.press("4");
    assert_eq!(picker.threads(), 4);
    picker.press("3"); // not a choice
    assert_eq!(picker.threads(), 4);
}

#[test]
fn escape_goes_back() {
    assert_eq!(picker_on(2).press("escape"), Outcome::Cancel);
}

#[test]
fn the_default_is_one_of_the_choices() {
    assert!(THREAD_CHOICES.contains(&ThreadPicker::default().threads()));
}

#[test]
fn threads_are_counted_in_the_singular_and_plural() {
    assert_eq!(threads_label(1), "1 thread");
    assert_eq!(threads_label(8), "8 threads");
}
