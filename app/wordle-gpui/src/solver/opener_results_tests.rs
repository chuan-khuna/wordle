use super::*;
use crate::solver::strategy::{MatrixSet, Rank, SearchMode};

/// A summary as the build writes it, cut down to two Strategies and three Openers (one with Losses).
const SMALL: &str = r#"{"bits-candidates":{"id":"bits-candidates","name":"Expected Information, Candidates only","complete_rows":2,"openers":[{"rank":1,"word":"salet","average_guess_count":3.528,"losses":8,"distribution":[0,148,1030,946,157,26],"bits":5.835,"is_answer":false},{"rank":2,"word":"crane","average_guess_count":3.55,"losses":0,"distribution":[1,140,1000,1000,150,24],"bits":5.743,"is_answer":true}]},"bits-all":{"id":"bits-all","name":"Expected Information, all words","complete_rows":1,"openers":[{"rank":1,"word":"tarse","average_guess_count":3.429,"losses":0,"distribution":[0,100,1200,900,100,15],"bits":5.9,"is_answer":false}]}}"#;

/// An empty folder of its own for one test.
fn temp_dir(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("wordle-gpui-opener-results-{name}-{}", std::process::id()));
    std::fs::remove_dir_all(&dir).ok();
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

fn small(name: &str) -> SummaryFile {
    let dir = temp_dir(name);
    std::fs::write(dir.join(SUMMARY_FILE), SMALL).unwrap();
    read_summary(&dir)
}

fn strategy(id: &str) -> Option<&'static Strategy> {
    Some(STRATEGIES.iter().find(|strategy| strategy.id == id).unwrap())
}

#[test]
fn the_summary_is_read_by_strategy_and_word() {
    let SummaryFile::Read(summary) = small("read") else { panic!("the small summary reads") };
    let salet = summary.get("bits-candidates", "salet").unwrap();
    assert_eq!(salet, &OpenerResult { rank: 1, average_guess_count: 3.528, losses: 8, distribution: [0, 148, 1030, 946, 157, 26] });
    assert_eq!(summary.get("bits-candidates", "crane").unwrap().rank, 2);
    assert_eq!(summary.get("bits-all", "tarse").unwrap().average_guess_count, 3.429);
    assert_eq!(summary.complete_rows("bits-candidates"), Some(2));
    assert_eq!(summary.complete_rows("bits-all"), Some(1));
    assert!(summary.get("bits-all", "salet").is_none(), "an Opener is looked up under its Strategy only");
    assert!(summary.get("expected-all", "tarse").is_none());
    assert_eq!(summary.complete_rows("expected-all"), None);
}

#[test]
fn a_missing_or_broken_summary_says_so() {
    assert!(matches!(read_summary(&temp_dir("missing")), SummaryFile::Missing));
    let dir = temp_dir("broken");
    std::fs::write(dir.join(SUMMARY_FILE), "{\"bits-all\": [1, 2").unwrap();
    assert!(matches!(read_summary(&dir), SummaryFile::Unreadable(_)));
}

#[test]
fn the_real_summary_reads_when_present() {
    // precompute-cache/ is only read, never written.
    if let SummaryFile::Unreadable(error) = read_summary(&guess_count_matrix::default_dir()) {
        panic!("the summary in precompute-cache/ doesn't read: {error}");
    }
}

#[test]
fn results_show_before_the_first_guess_only() {
    let summary = small("shown");
    let before = lookup(Some(&summary), strategy("bits-candidates"), "salet", 0);
    assert_eq!(before.result().map(|result| result.losses), Some(8));
    assert_eq!(before.note(), None);
    for made in [1, 3] {
        let after = lookup(Some(&summary), strategy("bits-candidates"), "salet", made);
        assert_eq!(after, Lookup::Hidden);
        assert_eq!(after.result(), None);
        assert_eq!(after.note(), None, "after the first Guess nothing shows, not even a note");
    }
}

#[test]
fn each_reason_for_no_results_has_its_note() {
    let summary = small("notes");
    let command = "Precompute guess counts…";

    let missing = lookup(Some(&SummaryFile::Missing), strategy("bits-all"), "salet", 0);
    assert_eq!(missing, Lookup::NoSummary);
    assert!(missing.note().unwrap().contains(command));
    assert!(missing.offers_command());

    let unnamed = Strategy::named(MatrixSet::Answers, SearchMode::Everything, Rank::Bits);
    assert_eq!(unnamed, None);
    let no_matrix = lookup(Some(&summary), unnamed, "salet", 0);
    assert_eq!(no_matrix, Lookup::NoMatrix);
    assert!(no_matrix.note().unwrap().contains("no Guess Count Matrix"));
    assert!(!no_matrix.offers_command(), "no run fills a Strategy without a name");
    assert_eq!(lookup(Some(&SummaryFile::Missing), unnamed, "salet", 0), Lookup::NoMatrix, "the Strategy is checked first");

    let not_computed = lookup(Some(&summary), strategy("expected-all"), "salet", 0);
    assert_eq!(not_computed, Lookup::NotComputed(strategy("expected-all").unwrap()));
    let note = not_computed.note().unwrap();
    assert!(note.contains("expected-all") && note.contains(command), "{note}");

    let unfinished = lookup(Some(&summary), strategy("bits-all"), "salet", 0);
    assert_eq!(unfinished, Lookup::Unfinished { strategy: strategy("bits-all").unwrap(), word: "salet", complete_rows: 1 });
    let note = unfinished.note().unwrap();
    assert!(note.contains("SALET") && note.contains("bits-all") && note.contains(command), "{note}");
    assert!(unfinished.offers_command());

    let unreadable = SummaryFile::Unreadable("expected value".into());
    let broken = lookup(Some(&unreadable), strategy("bits-all"), "salet", 0);
    assert!(broken.note().unwrap().contains("expected value"));

    let reading = lookup(None, strategy("bits-all"), "salet", 0);
    assert_eq!(reading, Lookup::Reading);
    assert_eq!(reading.note(), None);
    assert_eq!(reading.result(), None);
}

#[test]
fn the_guess_distribution_has_six_counts_then_lost() {
    let SummaryFile::Read(summary) = small("bars") else { panic!("the small summary reads") };
    let bars = summary.get("bits-candidates", "salet").unwrap().bars();
    let labels: Vec<&str> = bars.iter().map(|bar| bar.label).collect();
    assert_eq!(labels, ["1", "2", "3", "4", "5", "6", "Lost"]);
    let counts: Vec<usize> = bars.iter().map(|bar| bar.games).collect();
    assert_eq!(counts, [0, 148, 1030, 946, 157, 26, 8]);
    assert_eq!(bars.iter().filter(|bar| bar.lost).count(), 1);
    assert!(bars[6].lost);
}
