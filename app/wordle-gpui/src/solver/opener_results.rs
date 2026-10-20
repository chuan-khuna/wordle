//! What `summary.json` (see `guess_count_matrix.rs`) knows about each Opener, for the Solver panel:
//! its Average Guess Count, Losses and Guess Distribution under each Strategy. The panel shows them
//! only before the first Guess; `lookup` decides what shows, and `Lookup::note` says why nothing does.

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use serde_json::Value;

use super::guess_count_matrix::{self, SUMMARY_FILE};
use super::strategy::{STRATEGIES, Strategy};
use crate::engine::game::MAX_GUESSES as GUESS_LIMIT;

/// The command that fills the Guess Count Matrices, as the menu names it.
pub const COMMAND: &str = "Precompute guess counts…";

/// One Opener's line of the summary under one Strategy.
#[derive(Clone, Debug, PartialEq)]
pub struct OpenerResult {
    pub rank: usize,
    /// Over every Answer, Losses at their real count.
    pub average_guess_count: f64,
    /// Games that needed more than the Guess Limit.
    pub losses: usize,
    /// Games won in 1 to 6 Guesses.
    pub distribution: [usize; GUESS_LIMIT],
}

/// One bar of a Guess Distribution chart.
#[derive(Clone, Debug, PartialEq)]
pub struct Bar {
    pub label: &'static str,
    pub games: usize,
    /// The last bar: the Losses.
    pub lost: bool,
}

impl OpenerResult {
    /// The Guess Distribution as bars: Games won in 1 to 6 Guesses, then the Losses.
    pub fn bars(&self) -> Vec<Bar> {
        const LABELS: [&str; GUESS_LIMIT] = ["1", "2", "3", "4", "5", "6"];
        let won = LABELS.iter().zip(self.distribution).map(|(&label, games)| Bar { label, games, lost: false });
        won.chain(std::iter::once(Bar { label: "Lost", games: self.losses, lost: true })).collect()
    }
}

/// One Strategy's part of the summary.
#[derive(Debug, Default)]
struct StrategyResults {
    complete_rows: usize,
    openers: HashMap<String, OpenerResult>,
}

/// `summary.json` read into a lookup by Strategy id and word.
#[derive(Debug, Default)]
pub struct Summary {
    strategies: HashMap<String, StrategyResults>,
}

impl Summary {
    /// `word`'s results under the Strategy `id`, if its row is finished.
    pub fn get(&self, id: &str, word: &str) -> Option<&OpenerResult> {
        self.strategies.get(id)?.openers.get(word)
    }

    /// How many Openers the Strategy `id` has finished, or None if the summary doesn't cover it.
    pub fn complete_rows(&self, id: &str) -> Option<usize> {
        self.strategies.get(id).map(|results| results.complete_rows)
    }
}

/// What reading `summary.json` found.
#[derive(Debug)]
pub enum SummaryFile {
    /// No file: nothing has been precomputed.
    Missing,
    Unreadable(String),
    Read(Summary),
}

pub fn summary_path(dir: &Path) -> PathBuf {
    dir.join(SUMMARY_FILE)
}

/// Read `summary.json` in `dir` (`guess_count_matrix::default_dir()` for the app).
pub fn read_summary(dir: &Path) -> SummaryFile {
    match std::fs::read_to_string(summary_path(dir)) {
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => SummaryFile::Missing,
        Err(error) => SummaryFile::Unreadable(error.to_string()),
        Ok(text) => match parse(&text) {
            Ok(summary) => SummaryFile::Read(summary),
            Err(error) => SummaryFile::Unreadable(error),
        },
    }
}

/// Read the app's own `summary.json`.
pub fn read_default_summary() -> SummaryFile {
    read_summary(&guess_count_matrix::default_dir())
}

fn parse(text: &str) -> Result<Summary, String> {
    let json: Value = serde_json::from_str(text).map_err(|error| error.to_string())?;
    let strategies = json.as_object().ok_or("the summary is not a JSON object")?;
    let mut summary = Summary::default();
    for (id, part) in strategies {
        let bad = |what: &str| format!("{id}: {what}");
        let openers = part.get("openers").and_then(Value::as_array).ok_or_else(|| bad("no openers list"))?;
        let mut results = StrategyResults {
            complete_rows: part.get("complete_rows").and_then(Value::as_u64).map_or(openers.len(), |rows| rows as usize),
            openers: HashMap::with_capacity(openers.len()),
        };
        for opener in openers {
            let word = opener.get("word").and_then(Value::as_str).ok_or_else(|| bad("an opener without a word"))?;
            let number = |key: &str| opener.get(key).and_then(Value::as_u64).map(|n| n as usize).ok_or_else(|| bad(&format!("{word} has no {key}")));
            let distribution = opener.get("distribution").and_then(Value::as_array).filter(|counts| counts.len() == GUESS_LIMIT).ok_or_else(|| bad(&format!("{word} has no distribution of {GUESS_LIMIT}")))?;
            let mut counts = [0; GUESS_LIMIT];
            for (count, value) in counts.iter_mut().zip(distribution) {
                *count = value.as_u64().ok_or_else(|| bad(&format!("{word}'s distribution is not whole numbers")))? as usize;
            }
            let result = OpenerResult {
                rank: number("rank")?,
                average_guess_count: opener.get("average_guess_count").and_then(Value::as_f64).ok_or_else(|| bad(&format!("{word} has no average_guess_count")))?,
                losses: number("losses")?,
                distribution: counts,
            };
            results.openers.insert(word.to_string(), result);
        }
        summary.strategies.insert(id.clone(), results);
    }
    Ok(summary)
}

/// What the Solver panel shows about one Opener under the panel's Strategy.
#[derive(Debug, PartialEq)]
pub enum Lookup<'a> {
    /// After the first Guess: nothing, so it is never taken for a statement about the State.
    Hidden,
    /// The summary is still being read.
    Reading,
    Found(&'a OpenerResult),
    /// No `summary.json`.
    NoSummary,
    Unreadable(&'a str),
    /// The settings make no named Strategy, so no Guess Count Matrix exists for them.
    NoMatrix,
    /// The summary has nothing for this Strategy.
    NotComputed(&'static Strategy),
    /// The Strategy is there, but this Opener's row is not finished.
    Unfinished { strategy: &'static Strategy, word: &'a str, complete_rows: usize },
}

/// What to show for `word` under `strategy` (None for settings with no named Strategy), with
/// `guesses_made` Guesses on the board. `summary` is None until it has been read.
pub fn lookup<'a>(summary: Option<&'a SummaryFile>, strategy: Option<&'static Strategy>, word: &'a str, guesses_made: usize) -> Lookup<'a> {
    if guesses_made > 0 {
        return Lookup::Hidden;
    }
    let Some(strategy) = strategy else {
        return Lookup::NoMatrix;
    };
    let summary = match summary {
        None => return Lookup::Reading,
        Some(SummaryFile::Missing) => return Lookup::NoSummary,
        Some(SummaryFile::Unreadable(error)) => return Lookup::Unreadable(error),
        Some(SummaryFile::Read(summary)) => summary,
    };
    match (summary.get(strategy.id, word), summary.complete_rows(strategy.id)) {
        (Some(result), _) => Lookup::Found(result),
        (None, None) => Lookup::NotComputed(strategy),
        (None, Some(complete_rows)) => Lookup::Unfinished { strategy, word, complete_rows },
    }
}

/// The Average Guess Count of `word` for the Suggestions list, when it is known and may show.
pub fn average_guess_count(summary: Option<&SummaryFile>, strategy: Option<&'static Strategy>, word: &str, guesses_made: usize) -> Option<f64> {
    lookup(summary, strategy, word, guesses_made).result().map(|result| result.average_guess_count)
}

impl Lookup<'_> {
    pub fn result(&self) -> Option<&OpenerResult> {
        match self {
            Lookup::Found(result) => Some(result),
            _ => None,
        }
    }

    /// Why there is nothing to show, and what fills it; None when there is a result or nothing should show.
    pub fn note(&self) -> Option<String> {
        Some(match self {
            Lookup::Hidden | Lookup::Reading | Lookup::Found(_) => return None,
            Lookup::NoSummary => format!("No guess counts yet. Run {COMMAND} to fill them."),
            Lookup::Unreadable(error) => format!("Couldn't read the guess counts' summary.json: {error}"),
            Lookup::NoMatrix => {
                let named: Vec<&str> = STRATEGIES.iter().map(|strategy| strategy.id).collect();
                format!("These settings have no Guess Count Matrix; only the named Strategies do ({}).", named.join(", "))
            }
            Lookup::NotComputed(strategy) => format!("No guess counts for {} yet. Run {COMMAND} to fill them.", strategy.id),
            Lookup::Unfinished { strategy, word, complete_rows } => {
                format!("{}'s row in {} isn't finished ({complete_rows} Openers are). Run {COMMAND} to fill the rest.", word.to_uppercase(), strategy.id)
            }
        })
    }

    /// Whether running the command would fill what is missing (the panel offers a button).
    pub fn offers_command(&self) -> bool {
        matches!(self, Lookup::NoSummary | Lookup::NotComputed(_) | Lookup::Unfinished { .. })
    }
}

#[cfg(test)]
#[path = "opener_results_tests.rs"]
mod tests;
