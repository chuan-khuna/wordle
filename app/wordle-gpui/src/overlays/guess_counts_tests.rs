use std::path::PathBuf;

use super::*;

fn picker() -> GuessCountPicker {
    GuessCountPicker { threads: ThreadPicker { selected: 3 }, ..GuessCountPicker::default() }
}

fn ids(strategies: &[&Strategy]) -> Vec<&'static str> {
    strategies.iter().map(|strategy| strategy.id).collect()
}

#[test]
fn every_strategy_is_on_at_first_and_enter_runs_them() {
    match picker().press("enter") {
        Outcome::Run { threads, strategies } => {
            assert_eq!(threads, 8);
            assert_eq!(ids(&strategies), ["bits-candidates", "expected-candidates", "bits-all", "expected-all"]);
        }
        other => panic!("{other:?}"),
    }
}

#[test]
fn space_turns_the_highlighted_strategy_off_and_on() {
    let mut picker = picker();
    picker.press("down");
    picker.press("down");
    picker.press("space");
    assert_eq!(ids(&picker.strategies()), ["bits-candidates", "expected-candidates", "expected-all"]);
    picker.press("space");
    assert_eq!(picker.strategies().len(), 4);
}

#[test]
fn up_and_down_wrap_around() {
    let mut picker = picker();
    picker.press("up");
    assert_eq!(picker.cursor, 3);
    picker.press("down");
    assert_eq!(picker.cursor, 0);
}

#[test]
fn with_no_strategy_chosen_enter_does_nothing() {
    let mut picker = picker();
    for index in 0..4 {
        picker.toggle(index);
    }
    assert_eq!(picker.press("enter"), Outcome::None);
}

#[test]
fn left_right_and_digits_change_the_threads() {
    let mut picker = picker();
    picker.press("right");
    assert_eq!(picker.threads.threads(), 1);
    picker.press("left");
    assert_eq!(picker.threads.threads(), 8);
    picker.press("2");
    assert_eq!(picker.threads.threads(), 2);
}

#[test]
fn escape_goes_back() {
    assert_eq!(picker().press("escape"), Outcome::Cancel);
}

#[test]
fn enter_stops_a_run_and_escape_keeps_it_going() {
    assert_eq!(stop_key("enter"), StopOutcome::Stop);
    assert_eq!(stop_key("escape"), StopOutcome::KeepGoing);
    assert_eq!(stop_key("a"), StopOutcome::None);
}

#[test]
fn the_end_note_says_where_the_files_went_and_how_long_it_took() {
    let built = |stopped| Ok(Built { paths: vec![PathBuf::from("summary.json")], stopped, filled: 14855 });
    assert_eq!(end_note(&built(false), Duration::from_secs(185), 8), "Saved guess counts to precompute-cache/guess-counts-rust/ in 3 min 05s (14,855 rows, 8 threads)");
    assert_eq!(end_note(&built(true), Duration::from_millis(4200), 1), "Stopped guess counts after 4.2s: 14,855 rows kept in precompute-cache/guess-counts-rust/. Run it again to resume");
    let mismatch = Err(BuildError::Mismatch { strategy: "bits-all", reason: "there is no manifest.json".into() });
    assert_eq!(end_note(&mismatch, Duration::ZERO, 8), "Can't resume bits-all: there is no manifest.json. Delete precompute-cache/guess-counts-rust/ to start it over");
}

#[test]
fn durations_read_in_seconds_minutes_or_hours() {
    assert_eq!(duration_label(Duration::from_millis(11_040)), "11.0s");
    assert_eq!(duration_label(Duration::from_secs(3599)), "59 min 59s");
    assert_eq!(duration_label(Duration::from_secs(7620)), "2 h 07 min");
}
