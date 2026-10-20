use std::path::PathBuf;

use wordle_gpui::engine::game::Game;
use wordle_gpui::solver::guess_count_matrix::Event as Row;
use wordle_gpui::solver::matrix::Event as MatrixEvent;
use wordle_gpui::solver::strategy::STRATEGIES;

use super::*;

const ROWS: usize = 14_855;

fn secs(seconds: u64) -> Duration {
    Duration::from_secs(seconds)
}

fn texts(state: &RunState) -> Vec<&str> {
    state.log().iter().map(|line| line.text.as_str()).collect()
}

fn last(state: &RunState) -> &LogLine {
    state.log().back().unwrap()
}

/// A run of bits-candidates and bits-all, resumed: bits-candidates had 14,000 rows, bits-all 100.
fn resumed_run() -> RunState {
    let (candidates, all) = (&STRATEGIES[0], &STRATEGIES[2]);
    let mut state = RunState::guess_counts(8, &[candidates, all], ROWS);
    state.apply_guess_counts(Row::Planned { strategy: candidates, finished: 14_000, to_fill: 855 }, secs(1));
    state.apply_guess_counts(Row::Planned { strategy: all, finished: 100, to_fill: 14_755 }, secs(1));
    state
}

#[test]
fn a_resumed_run_starts_its_bar_at_the_rows_already_done() {
    let state = resumed_run();
    assert_eq!((state.done(), state.total()), (14_100, 2 * ROWS));
    assert!(state.items.iter().all(|item| item.phase == Phase::Waiting));
    assert_eq!(state.items[0].done, 14_000);
    assert_eq!(state.items[1].done, 100);
    assert_eq!(state.progress_line(secs(1)), "14,100 of 29,710 rows");
    assert_eq!(
        texts(&state),
        ["Precompute guess counts on 8 threads into precompute-cache/guess-counts-rust/: bits-candidates, bits-all", "Reading the Feedback matrices and the rows already done"]
    );
}

#[test]
fn rows_move_their_strategy_and_the_rate_gives_the_time_left() {
    let mut state = resumed_run();
    let candidates = &STRATEGIES[0];
    state.apply_guess_counts(Row::PassStarted { strategy: candidates, finished: 14_000, to_fill: 855 }, secs(10));
    assert_eq!(state.items[0].phase, Phase::Running);
    assert_eq!(last(&state).text, "bits-candidates started: 14,000 rows already done, 855 to fill");
    // Threads report out of order: the furthest counts.
    for done in [2, 1, 3] {
        state.apply_guess_counts(Row::RowDone { strategy: candidates, word: "salet", done, total: 855, average_guess_count: 3.4212, losses: 0 }, secs(11));
    }
    assert_eq!(state.items[0].done, 14_003);
    assert_eq!(last(&state).text, "bits-candidates salet: 3.421 Guesses on average, no Losses");
    assert_eq!(last(&state).tone, Tone::Row);
    // 3 rows in 2 s: 1.5 rows/s, and 15,607 rows left take about 2 h 53 min.
    assert_eq!(state.rate(secs(12)), Some(1.5));
    assert_eq!(state.progress_line(secs(12)), "14,103 of 29,710 rows · 1.5 rows/s · about 2 h 53 min left");
    state.apply_guess_counts(Row::RowDone { strategy: candidates, word: "zymic", done: 4, total: 855, average_guess_count: 5.0, losses: 2 }, secs(12));
    assert_eq!(last(&state).text, "bits-candidates zymic: 5.000 Guesses on average, 2 Losses");
    state.apply_guess_counts(Row::Flushed { strategy: candidates, done: 4 }, secs(12));
    assert_eq!(last(&state).text, "Saved the finished rows to disk (bits-candidates: 4 this pass)");
}

#[test]
fn a_finished_pass_and_a_finished_run() {
    let mut state = resumed_run();
    let (candidates, all) = (&STRATEGIES[0], &STRATEGIES[2]);
    state.apply_guess_counts(Row::PassStarted { strategy: candidates, finished: 14_855, to_fill: 0 }, secs(2));
    assert_eq!(last(&state).text, "bits-candidates started: 14,855 rows already done, nothing to fill");
    state.apply_guess_counts(Row::PassEnded { strategy: candidates, filled: 0, stopped: false }, secs(2));
    assert_eq!(state.items[0].phase, Phase::Finished);
    assert_eq!(last(&state).text, "bits-candidates finished: 0 rows filled");
    assert_eq!(state.items[1].phase, Phase::Waiting);
    state.apply_guess_counts(Row::PassStarted { strategy: all, finished: 100, to_fill: 14_755 }, secs(3));
    state.apply_guess_counts(Row::RowDone { strategy: all, word: "zymic", done: 14_755, total: 14_755, average_guess_count: 4.0, losses: 1 }, secs(1000));
    state.apply_guess_counts(Row::PassEnded { strategy: all, filled: 14_755, stopped: false }, secs(1000));
    assert!(state.is_running());
    let built = Ok(Built { paths: vec![PathBuf::from("summary.json")], stopped: false, filled: 14_755 });
    state.finish_guess_counts(&built, secs(1001));
    assert!(!state.is_running());
    assert_eq!(state.end, Some((End::Finished, secs(1001))));
    assert_eq!(last(&state).text, "Saved guess counts to precompute-cache/guess-counts-rust/ in 16 min 41s (14,755 rows, 8 threads)");
    assert_eq!(last(&state).tone, Tone::Success);
    // The time stops with the run.
    assert_eq!(state.progress_line(secs(5000)), "29,710 of 29,710 rows · 16 min 41s");
}

#[test]
fn a_stopped_run_keeps_its_rows_and_says_so() {
    let mut state = resumed_run();
    let candidates = &STRATEGIES[0];
    state.apply_guess_counts(Row::PassStarted { strategy: candidates, finished: 14_000, to_fill: 855 }, secs(2));
    assert!(state.can_stop());
    state.ask_stop(secs(3));
    assert!(!state.can_stop());
    assert_eq!(last(&state).text, "Stop asked for: each thread drops the Opener it is playing; finished rows are kept");
    state.apply_guess_counts(Row::PassEnded { strategy: candidates, filled: 12, stopped: true }, secs(4));
    assert_eq!(last(&state).text, "bits-candidates stopped: 12 rows filled and kept");
    let built = Ok(Built { paths: vec![], stopped: true, filled: 12 });
    state.finish_guess_counts(&built, secs(4));
    assert_eq!(state.end, Some((End::Stopped, secs(4))));
    assert_eq!([state.items[0].phase, state.items[1].phase], [Phase::Stopped, Phase::NotStarted]);
    assert_eq!(last(&state).text, "Stopped guess counts after 4.0s: 12 rows kept in precompute-cache/guess-counts-rust/. Run it again to resume");
    assert_eq!(last(&state).tone, Tone::Warning);
}

#[test]
fn a_manifest_mismatch_ends_the_run_with_what_to_do() {
    let mut state = resumed_run();
    let mismatch = Err(BuildError::Mismatch { strategy: "bits-all", reason: "there is no manifest.json".into() });
    state.finish_guess_counts(&mismatch, secs(1));
    assert_eq!(state.end, Some((End::Failed, secs(1))));
    assert!(state.items.iter().all(|item| item.phase == Phase::NotStarted));
    assert_eq!(last(&state).text, "Can't resume bits-all: there is no manifest.json. Delete precompute-cache/guess-counts-rust/ to start it over");
    assert_eq!(last(&state).tone, Tone::Error);
}

#[test]
fn a_matrices_run_logs_each_matrix_and_its_file() {
    let mut state = RunState::matrices(4, ROWS, 2315);
    assert!(!state.can_stop(), "the matrices take about a second: no Stop");
    assert_eq!(state.items[0].detail, "Guess List × Answer List, 14,855 × 2,315");
    state.apply_matrix(MatrixEvent::Started { file: GUESSES_FILE, rows: ROWS, columns: 2315 }, secs(0));
    assert_eq!(last(&state).text, "guesses_vs_answers.npy started: 14,855 × 2,315, scoring every pair");
    state.apply_matrix(MatrixEvent::Rows { file: GUESSES_FILE, done: 512, rows: ROWS }, secs(0));
    state.apply_matrix(MatrixEvent::Rows { file: GUESSES_FILE, done: 256, rows: ROWS }, secs(0));
    assert_eq!(state.items[0].done, 512);
    assert_eq!(state.items[0].phase, Phase::Running);
    state.apply_matrix(MatrixEvent::Started { file: ANSWERS_FILE, rows: 2315, columns: 2315 }, secs(1));
    state.apply_matrix(MatrixEvent::Saved { file: ANSWERS_FILE, path: PathBuf::from("x/answers_vs_answers.npy"), rows: 2315, columns: 2315, bytes: 128 + 2315 * 2315 }, secs(1));
    assert_eq!(last(&state).text, "Saved answers_vs_answers.npy: 2,315 × 2,315, 5.4 MB (x/answers_vs_answers.npy)");
    assert_eq!(state.items[1].phase, Phase::Finished);
    state.finish_matrices(&Ok((PathBuf::new(), PathBuf::new())), Duration::from_millis(1200));
    assert_eq!(state.items[0].phase, Phase::Finished, "a running matrix is finished when the run is");
    assert_eq!(texts(&state)[0], "Precompute matrices on 4 threads into precompute-cache/feedback-rust/");
    assert_eq!(last(&state).text, "Saved the matrices to precompute-cache/feedback-rust/ in 1.2s (4 threads)");
}

#[test]
fn a_failed_matrices_run_says_why() {
    let mut state = RunState::matrices(1, ROWS, 2315);
    state.finish_matrices(&Err(io::Error::other("disk full")), secs(1));
    assert_eq!(state.end, Some((End::Failed, secs(1))));
    assert_eq!(last(&state).text, "Couldn't save the matrices: disk full");
}

#[test]
fn the_log_keeps_the_last_lines_and_counts_the_rest() {
    let mut state = resumed_run();
    let candidates = &STRATEGIES[0];
    for done in 1..=MAX_LOG_LINES + 10 {
        state.apply_guess_counts(Row::RowDone { strategy: candidates, word: "salet", done, total: ROWS, average_guess_count: 3.0, losses: 0 }, secs(5));
    }
    assert_eq!(state.log().len(), MAX_LOG_LINES);
    assert_eq!(state.dropped(), 12, "the two opening lines and ten rows");
}

#[test]
fn keys_go_back_to_the_game_only_once_the_run_has_ended() {
    let mut state = resumed_run();
    assert_eq!(state.press("escape"), Outcome::None);
    assert_eq!(state.press("a"), Outcome::None);
    state.finish_guess_counts(&Ok(Built { paths: vec![], stopped: false, filled: 0 }), secs(1));
    assert_eq!(state.press("escape"), Outcome::BackToGame);
    assert_eq!(state.press("enter"), Outcome::BackToGame);
    assert_eq!(state.press("a"), Outcome::None);
}

#[test]
fn a_run_hides_the_game_and_leaves_its_state_alone() {
    let mut game = Game::random(7, Some(6));
    game.guess("crane").unwrap();
    let before = game.guesses().to_vec();
    let mut run = Some(resumed_run());
    assert_eq!(main_area(run.is_some(), false), Area::Precompute);
    assert_eq!(main_area(run.is_some(), true), Area::Precompute);
    let state = run.as_mut().unwrap();
    state.finish_guess_counts(&Ok(Built { paths: vec![], stopped: false, filled: 0 }), secs(1));
    if state.press("escape") == Outcome::BackToGame {
        run = None;
    }
    assert_eq!(main_area(run.is_some(), false), Area::Game);
    assert_eq!(main_area(run.is_some(), true), Area::SolverMode);
    assert_eq!(game.guesses(), before);
}

#[test]
fn log_times_read_as_hours_minutes_seconds() {
    assert_eq!(clock(Duration::from_millis(125_900)), "00:02:05");
    assert_eq!(clock(secs(3 * 3600 + 7)), "03:00:07");
}
