use std::sync::OnceLock;

use super::*;
use crate::solver::guess_counts::tests::{feedback, play_alone};

/// The eight Benchmarks, played once for all the tests.
fn benchmarks() -> &'static [Benchmark] {
    static BENCHMARKS: OnceLock<Vec<Benchmark>> = OnceLock::new();
    BENCHMARKS.get_or_init(|| run_benchmarks(feedback(), 4, &|_| {}))
}

fn benchmark(id: &str) -> &'static Benchmark {
    benchmarks().iter().find(|benchmark| benchmark.strategy.id == id).unwrap()
}

/// An empty folder of its own for one test.
fn temp_dir(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("wordle-gpui-benchmark-{name}-{}", std::process::id()));
    std::fs::remove_dir_all(&dir).ok();
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

#[test]
fn files_go_in_the_shared_cache() {
    assert!(default_dir().ends_with("precompute-cache/benchmark"));
}

#[test]
fn json_is_written_as_pythons_json_dumps_with_indent_1() {
    let value = json!({"a": 1, "b": [], "c": [3.0, 0.1, true, "x"], "d": {"e": null}});
    assert_eq!(python_json(&value), "{\n \"a\": 1,\n \"b\": [],\n \"c\": [\n  3.0,\n  0.1,\n  true,\n  \"x\"\n ],\n \"d\": {\n  \"e\": null\n }\n}\n");
}

#[test]
fn every_strategy_is_played_in_order_from_its_own_opener() {
    let ids: Vec<&str> = benchmarks().iter().map(|benchmark| benchmark.strategy.id).collect();
    assert_eq!(ids, STRATEGIES.iter().map(|strategy| strategy.id).collect::<Vec<_>>());
    for benchmark in benchmarks() {
        assert_eq!(benchmark.games, feedback().columns.len());
        assert_eq!(benchmark.distribution.iter().sum::<usize>() + benchmark.lost_answers.len(), benchmark.games, "{}", benchmark.strategy.id);
        assert!(benchmark.lost_answers.is_sorted());
    }
    // The Opener is ranked over the whole Guess Pool, whatever the Search Scope.
    assert_eq!(benchmark("bits-guesses-candidates").opener, benchmark("bits-guesses-all").opener);
    assert!(feedback().columns.binary_search(&benchmark("bits-guesses-candidates").opener).is_err());
    assert!(feedback().columns.binary_search(&benchmark("bits-answers-all").opener).is_ok());
}

#[test]
fn a_few_games_match_playing_each_alone() {
    let benchmark = benchmark("bits-answers-candidates");
    let lost = benchmark.lost_answers[0];
    let lost_column = feedback().columns.binary_search(&lost).unwrap();
    assert!(usize::from(play_alone(benchmark.strategy, benchmark.opener, lost_column)) > GUESS_LIMIT);
    for column in (0..feedback().columns.len()).step_by(400) {
        let count = usize::from(play_alone(benchmark.strategy, benchmark.opener, column));
        assert!(count > GUESS_LIMIT || benchmark.distribution[count - 1] > 0);
    }
}

#[test]
fn the_leaderboard_is_ranked_by_bits() {
    let openers = opener_leaderboard(feedback(), 10);
    assert_eq!(openers.iter().map(|opener| opener.rank).collect::<Vec<_>>(), (1..=10).collect::<Vec<_>>());
    assert!(openers.windows(2).all(|pair| pair[0].bits >= pair[1].bits));
    let tarse = &openers[0];
    assert_eq!((tarse.word, tarse.groups, tarse.largest_group, tarse.is_candidate), ("tarse", 147, 227, false));
}

/// The Python command's folder to compare with: `WORDLE_PYTHON_BENCHMARK` if set, or else
/// `precompute-cache/benchmark/`, if both files are there (`just precompute-benchmark` writes them).
fn python_reference() -> Option<PathBuf> {
    let dir = std::env::var_os("WORDLE_PYTHON_BENCHMARK").map_or_else(default_dir, PathBuf::from);
    (dir.join(BENCHMARK_FILE).exists() && dir.join(OPENERS_FILE).exists()).then_some(dir)
}

#[test]
fn the_files_equal_the_python_commands_files() {
    let Some(reference) = python_reference() else {
        eprintln!("skipped: no benchmark written by `just precompute-benchmark`");
        return;
    };
    let dir = temp_dir("python");
    let (benchmark_path, openers_path) = build(&dir, feedback(), 4, &|_| {}).unwrap();
    assert!(std::fs::read_to_string(benchmark_path).unwrap() == std::fs::read_to_string(reference.join(BENCHMARK_FILE)).unwrap(), "{BENCHMARK_FILE} differs");
    assert!(std::fs::read_to_string(openers_path).unwrap() == std::fs::read_to_string(reference.join(OPENERS_FILE)).unwrap(), "{OPENERS_FILE} differs");
    std::fs::remove_dir_all(&dir).ok();
}
