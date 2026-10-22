//! The Benchmark and the Opener leaderboard, the same two files as the Python package's
//! `wordle/solver/benchmark.py` writes (`just precompute-benchmark`), byte for byte, in the same
//! folder: `precompute-cache/benchmark/`, which the website's backend reads.
//!
//! - `benchmark.json`: for each of the eight Strategies, every Answer played from that Strategy's own
//!   best Opener (ranked over its whole Guess Pool, whatever its Search Scope): its Guess
//!   Distribution, Losses (Games over the Guess Limit of six) and Average Guess Count (every Game, a
//!   Loss at the Guess Count it needed, as in the Guess Count Matrix).
//! - `openers.json`: the best `LEADERBOARD_SIZE` first Guesses of the Guess List by Expected
//!   Information over the whole Answer List, with their first-turn stats.
//!
//! The Games are played as a tree by `guess_counts::Player`, as the Python package plays them.

use std::io;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::thread;

use serde_json::{Value, json};

use super::guess_count_matrix::python_float;
use super::guess_counts::Player;
use super::strategy::{CODES, Matrix, Rank, STRATEGIES, SearchMode, Strategy, suggest};
use crate::engine::game::MAX_GUESSES as GUESS_LIMIT;

pub const SUBDIR: &str = "benchmark";
pub const BENCHMARK_FILE: &str = "benchmark.json";
pub const OPENERS_FILE: &str = "openers.json";
/// Openers saved in the leaderboard.
pub const LEADERBOARD_SIZE: usize = 500;

/// Where the files go: `precompute-cache/benchmark/` at the repo root, shared with the Python command.
pub fn default_dir() -> PathBuf {
    let repo_root = Path::new(env!("CARGO_MANIFEST_DIR")).ancestors().nth(2).expect("the app is two folders below the repo root");
    repo_root.join("precompute-cache").join(SUBDIR)
}

/// The Benchmark of one Strategy, as `benchmark.json` records it.
#[derive(Clone, Debug, PartialEq)]
pub struct Benchmark {
    pub strategy: &'static Strategy,
    pub opener: &'static str,
    pub games: usize,
    /// Games won in 1 to 6 Guesses.
    pub distribution: [usize; GUESS_LIMIT],
    /// The Answers lost, alphabetically.
    pub lost_answers: Vec<&'static str>,
    /// Over every Game, Losses at their real count.
    pub average_guess_count: f64,
}

/// One line of the Opener leaderboard: a first Guess's stats over the whole Answer List.
#[derive(Clone, Debug, PartialEq)]
pub struct Opener {
    pub rank: usize,
    pub word: &'static str,
    pub bits: f64,
    pub expected_candidates: f64,
    /// How many different Feedbacks it can get back.
    pub groups: usize,
    /// The most Answers left after its worst Feedback.
    pub largest_group: usize,
    pub is_candidate: bool,
}

/// What a run reports as it goes, for the precompute view's log. Sent from any thread.
#[derive(Clone, Debug, PartialEq)]
pub enum Event {
    /// A Strategy's Benchmark is done: `done` of the eight so far (threads report out of order).
    Played { benchmark: Benchmark, done: usize },
    /// The Opener leaderboard is ranked.
    Ranked { openers: usize },
}

/// The Strategy's Opener: the first pick of its Ranking over its whole Guess Pool, whatever its
/// Search Scope (`benchmark.best_opener` in the Python package). A row of `player`'s matrix.
pub fn best_opener(player: &mut Player, strategy: &Strategy) -> u32 {
    let all: Vec<u16> = (0..player.answers() as u16).collect();
    player.next_guess(Strategy::named(strategy.set, SearchMode::Everything, strategy.by), &all)
}

/// The Benchmark of `strategy`, played by `player` over the Guess × Answer matrix `feedback`.
pub fn run_benchmark(player: &mut Player, feedback: &Matrix, strategy: &'static Strategy) -> Benchmark {
    let opener = best_opener(player, strategy);
    let counts = player.guess_counts(strategy, opener as usize, None).expect("nothing stops it");
    let distribution = std::array::from_fn(|n| counts.iter().filter(|&&count| usize::from(count) == n + 1).count());
    let lost_answers = counts.iter().zip(&feedback.columns).filter(|&(&count, _)| usize::from(count) > GUESS_LIMIT).map(|(_, &answer)| answer).collect();
    let total: u64 = counts.iter().map(|&count| u64::from(count)).sum();
    Benchmark {
        strategy,
        opener: feedback.rows[opener as usize],
        games: counts.len(),
        distribution,
        lost_answers,
        average_guess_count: total as f64 / counts.len() as f64,
    }
}

/// The Benchmark of every Strategy, in `STRATEGIES` order, on up to `threads` threads (each with
/// its own `Player`).
pub fn run_benchmarks(feedback: &Matrix, threads: usize, events: &(dyn Fn(Event) + Sync)) -> Vec<Benchmark> {
    let next = AtomicUsize::new(0);
    let done = AtomicUsize::new(0);
    let results: Mutex<Vec<Option<Benchmark>>> = Mutex::new(vec![None; STRATEGIES.len()]);
    thread::scope(|scope| {
        for _ in 0..threads.clamp(1, STRATEGIES.len()) {
            scope.spawn(|| {
                let mut player = Player::new(feedback);
                while let Some(strategy) = STRATEGIES.get(next.fetch_add(1, Ordering::Relaxed)) {
                    let benchmark = run_benchmark(&mut player, feedback, strategy);
                    let index = STRATEGIES.iter().position(|other| other.id == strategy.id).expect("a Strategy of STRATEGIES");
                    results.lock().expect("a benchmark thread panicked")[index] = Some(benchmark.clone());
                    events(Event::Played { benchmark, done: done.fetch_add(1, Ordering::Relaxed) + 1 });
                }
            });
        }
    });
    results.into_inner().expect("a benchmark thread panicked").into_iter().map(|benchmark| benchmark.expect("every Strategy was played")).collect()
}

/// The best `size` first Guesses of the Guess List by Expected Information over the whole Answer
/// List (ties: a Candidate first, then Expected Candidates, then alphabetical).
pub fn opener_leaderboard(feedback: &Matrix, size: usize) -> Vec<Opener> {
    let all: Vec<usize> = (0..feedback.columns.len()).collect();
    suggest(feedback, &all, SearchMode::Everything, Rank::Bits, size)
        .into_iter()
        .enumerate()
        .map(|(index, suggestion)| {
            let row = feedback.rows.binary_search(&suggestion.word).expect("a Suggestion is on the Guess List");
            let mut sizes = [0usize; CODES];
            for &code in feedback.row(row) {
                sizes[code as usize] += 1;
            }
            Opener {
                rank: index + 1,
                word: suggestion.word,
                bits: suggestion.bits,
                expected_candidates: suggestion.expected_left,
                groups: sizes.iter().filter(|&&size| size > 0).count(),
                largest_group: sizes.into_iter().max().unwrap_or(0),
                is_candidate: suggestion.is_candidate,
            }
        })
        .collect()
}

fn benchmark_json(benchmark: &Benchmark) -> Value {
    let strategy = benchmark.strategy;
    json!({
        "id": strategy.id,
        "name": strategy.name,
        "pool": strategy.pool(),
        "scope": strategy.scope(),
        "by": strategy.ranking(),
        "opener": benchmark.opener,
        "games": benchmark.games,
        "distribution": benchmark.distribution,
        "losses": benchmark.lost_answers.len(),
        "lost_answers": benchmark.lost_answers,
        "average_guess_count": benchmark.average_guess_count,
    })
}

fn opener_json(opener: &Opener) -> Value {
    json!({
        "rank": opener.rank,
        "word": opener.word,
        "bits": opener.bits,
        "expected_candidates": opener.expected_candidates,
        "groups": opener.groups,
        "largest_group": opener.largest_group,
        "is_candidate": opener.is_candidate,
    })
}

/// `value` as Python's `json.dumps(value, indent=1)` writes it, with a newline at the end: one
/// item per line, each level one space further in, `[]` for an empty list, floats as `repr` prints them.
pub fn python_json(value: &Value) -> String {
    fn write(value: &Value, depth: usize, out: &mut String) {
        let indent = |depth: usize| format!("\n{}", " ".repeat(depth));
        match value {
            Value::Array(items) if items.is_empty() => out.push_str("[]"),
            Value::Object(fields) if fields.is_empty() => out.push_str("{}"),
            Value::Array(items) => {
                out.push('[');
                for (index, item) in items.iter().enumerate() {
                    out.push_str(if index == 0 { "" } else { "," });
                    out.push_str(&indent(depth + 1));
                    write(item, depth + 1, out);
                }
                out.push_str(&indent(depth));
                out.push(']');
            }
            Value::Object(fields) => {
                out.push('{');
                for (index, (key, item)) in fields.iter().enumerate() {
                    out.push_str(if index == 0 { "" } else { "," });
                    out.push_str(&indent(depth + 1));
                    out.push_str(&Value::String(key.clone()).to_string());
                    out.push_str(": ");
                    write(item, depth + 1, out);
                }
                out.push_str(&indent(depth));
                out.push('}');
            }
            Value::Number(number) if number.is_f64() => out.push_str(&python_float(number.as_f64().expect("an f64"))),
            other => out.push_str(&other.to_string()),
        }
    }
    let mut out = String::new();
    write(value, 0, &mut out);
    out + "\n"
}

/// The text of `benchmark.json`.
pub fn benchmark_file(benchmarks: &[Benchmark]) -> String {
    let strategies: Vec<Value> = benchmarks.iter().map(benchmark_json).collect();
    python_json(&json!({"guess_limit": GUESS_LIMIT, "strategies": strategies}))
}

/// The text of `openers.json`.
pub fn openers_file(openers: &[Opener]) -> String {
    let openers: Vec<Value> = openers.iter().map(opener_json).collect();
    python_json(&json!({"openers": openers}))
}

/// Play every Strategy's Benchmark and rank the Opener leaderboard over the Guess × Answer matrix
/// `feedback`, then write `benchmark.json` and `openers.json` into `dir`. Returns their paths.
pub fn build(dir: &Path, feedback: &Matrix, threads: usize, events: &(dyn Fn(Event) + Sync)) -> io::Result<(PathBuf, PathBuf)> {
    let benchmarks = run_benchmarks(feedback, threads, events);
    let openers = opener_leaderboard(feedback, LEADERBOARD_SIZE);
    events(Event::Ranked { openers: openers.len() });
    std::fs::create_dir_all(dir)?;
    let (benchmark_path, openers_path) = (dir.join(BENCHMARK_FILE), dir.join(OPENERS_FILE));
    std::fs::write(&benchmark_path, benchmark_file(&benchmarks))?;
    std::fs::write(&openers_path, openers_file(&openers))?;
    Ok((benchmark_path, openers_path))
}

#[cfg(test)]
#[path = "benchmark_tests.rs"]
mod tests;
