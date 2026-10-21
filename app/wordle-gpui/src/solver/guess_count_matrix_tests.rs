use std::sync::atomic::AtomicBool;

use super::*;
use crate::solver::guess_counts::tests::feedback;

/// An empty folder of its own for one test.
fn temp_dir(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("wordle-gpui-guess-counts-{name}-{}", std::process::id()));
    std::fs::remove_dir_all(&dir).ok();
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

fn strategy(id: &str) -> &'static Strategy {
    STRATEGIES.iter().find(|strategy| strategy.id == id).unwrap()
}

/// Build `strategies` in `dir` for `openers` on `threads` threads.
fn build_some(dir: &Path, strategies: &[&str], openers: &[&str], threads: usize) -> Built {
    let stop = AtomicBool::new(false);
    let options = Options {
        threads,
        strategies: strategies.iter().map(|id| strategy(id)).collect(),
        openers: Some(openers.iter().map(|word| word.to_string()).collect()),
        events: &|_| {},
        stop: &stop,
    };
    build(dir, feedback(), options).unwrap()
}

fn cells(dir: &Path, id: &str) -> Vec<u8> {
    read_matrix(dir, strategy(id), feedback()).unwrap().unwrap()
}

/// The row of `word` in the cells of a Guess List Strategy's matrix.
fn row_of<'a>(cells: &'a [u8], word: &str) -> &'a [u8] {
    pool_row(cells, MatrixSet::ValidGuesses, word)
}

/// The row of `word` in the cells of a matrix whose rows are the Guess Pool `set`.
fn pool_row<'a>(cells: &'a [u8], set: MatrixSet, word: &str) -> &'a [u8] {
    let feedback = feedback();
    let row = pool_words(feedback, set).binary_search(&word).unwrap();
    &cells[row * feedback.columns.len()..(row + 1) * feedback.columns.len()]
}

/// Every file under `dir`, by its path relative to `dir`, with its bytes.
fn files(dir: &Path) -> Vec<(PathBuf, Vec<u8>)> {
    let mut found = Vec::new();
    let mut folders = vec![dir.to_path_buf()];
    while let Some(folder) = folders.pop() {
        for entry in std::fs::read_dir(&folder).unwrap() {
            let path = entry.unwrap().path();
            if path.is_dir() {
                folders.push(path);
            } else {
                found.push((path.strip_prefix(dir).unwrap().to_path_buf(), std::fs::read(&path).unwrap()));
            }
        }
    }
    found.sort();
    found
}

/// Copy the files under `from` whose extension is one of `extensions` into `to`, subfolders included.
fn copy_files(from: &Path, to: &Path, extensions: &[&str]) {
    for (name, bytes) in files(from) {
        if name.extension().is_some_and(|extension| extensions.iter().any(|wanted| extension == *wanted)) {
            std::fs::create_dir_all(to.join(&name).parent().unwrap()).unwrap();
            std::fs::write(to.join(&name), bytes).unwrap();
        }
    }
}

fn played(id: &str, word: &str) -> Vec<u8> {
    let mut player = Player::new(feedback());
    let row = player.row_of(word).unwrap();
    player.guess_counts(strategy(id), row, None).unwrap()
}

#[test]
fn build_fills_the_rows_asked_for_and_nothing_else() {
    let dir = temp_dir("asked");
    let built = build_some(&dir, &["bits-guesses-candidates", "expected-guesses-candidates"], &["salet", "zymic"], 2);
    assert_eq!(built.filled, 4);
    assert!(!built.stopped);
    assert_eq!(built.paths.last().unwrap(), &dir.join(SUMMARY_FILE));
    for id in ["bits-guesses-candidates", "expected-guesses-candidates"] {
        let cells = cells(&dir, id);
        assert_eq!(row_of(&cells, "salet"), played(id, "salet"));
        assert_eq!(row_of(&cells, "zymic"), played(id, "zymic"));
        let filled = cells.chunks(feedback().columns.len()).filter(|row| row.iter().any(|&cell| cell != 0)).count();
        assert_eq!(filled, 2, "{id}: rows not asked for stay zero");
    }
    // The file is the `.npy` numpy writes, under its Ranking's folder: the header, then 14,855 × 2,315 cells.
    assert_eq!(matrix_path(&dir, strategy("bits-guesses-candidates")), dir.join("bits").join("guesses-candidates.npy"));
    let bytes = std::fs::read(matrix_path(&dir, strategy("bits-guesses-candidates"))).unwrap();
    assert_eq!(bytes[..128], npy_header(14855, 2315)[..]);
    assert_eq!(bytes.len(), 128 + 14855 * 2315);
    assert!(dir.join("bits").join("guesses-candidates.ranking.csv").exists());
    assert!(dir.join("expected").join("guesses-candidates.ranking.csv").exists());
    std::fs::remove_dir_all(&dir).ok();
}

#[test]
fn an_answer_list_matrix_has_a_row_per_answer_and_skips_other_openers() {
    let dir = temp_dir("answers");
    // salet and zymic are not on the Answer List, so the Answer List Strategy skips them.
    let built = build_some(&dir, &["bits-answers-candidates", "bits-guesses-candidates"], &["salet", "crane", "zymic", "aback"], 2);
    assert_eq!(built.filled, 2 + 4);
    let bytes = std::fs::read(dir.join("bits").join("answers-candidates.npy")).unwrap();
    assert_eq!(bytes[..128], npy_header(2315, 2315)[..]);
    assert_eq!(bytes.len(), 128 + 2315 * 2315);
    let answers = cells(&dir, "bits-answers-candidates");
    assert_eq!(answers.chunks(2315).filter(|row| row.iter().any(|&cell| cell != 0)).count(), 2);
    // After the Opener, Candidates only guesses only Answer List words: an Answer List row is the
    // same row of the Guess List matrix.
    let guesses = cells(&dir, "bits-guesses-candidates");
    for word in ["crane", "aback"] {
        assert_eq!(pool_row(&answers, MatrixSet::Answers, word), row_of(&guesses, word), "{word}");
        assert_eq!(pool_row(&answers, MatrixSet::Answers, word), played("bits-answers-candidates", word), "{word}");
    }
    // Its summary ranks its own rows only, every one an Answer.
    let summary: Value = serde_json::from_str(&std::fs::read_to_string(dir.join(SUMMARY_FILE)).unwrap()).unwrap();
    let openers = summary["bits-answers-candidates"]["openers"].as_array().unwrap();
    let mut words: Vec<&str> = openers.iter().map(|opener| opener["word"].as_str().unwrap()).collect();
    words.sort();
    assert_eq!(words, ["aback", "crane"]);
    assert!(openers.iter().all(|opener| opener["is_answer"] == json!(true)));
    assert_eq!(summary["bits-guesses-candidates"]["complete_rows"], json!(4));
    std::fs::remove_dir_all(&dir).ok();
}

#[test]
fn an_opener_on_no_list_is_an_error() {
    let dir = temp_dir("unknown");
    let stop = AtomicBool::new(false);
    let options = Options { threads: 1, strategies: vec![strategy("bits-answers-all")], openers: Some(vec!["zzzzz".into()]), events: &|_| {}, stop: &stop };
    assert!(matches!(build(&dir, feedback(), options), Err(BuildError::UnknownOpener(word)) if word == "zzzzz"));
    assert!(files(&dir).is_empty());
    std::fs::remove_dir_all(&dir).ok();
}

#[test]
fn one_thread_and_several_write_the_same_bytes() {
    let one = temp_dir("one-thread");
    let four = temp_dir("four-threads");
    let openers: Vec<&str> = feedback().rows.iter().copied().step_by(997).collect();
    build_some(&one, &["expected-guesses-candidates"], &openers, 1);
    build_some(&four, &["expected-guesses-candidates"], &openers, 4);
    for file in ["expected/guesses-candidates.npy", "expected/guesses-candidates.ranking.csv", SUMMARY_FILE] {
        assert!(std::fs::read(one.join(file)).unwrap() == std::fs::read(four.join(file)).unwrap(), "{file}");
    }
    std::fs::remove_dir_all(&one).ok();
    std::fs::remove_dir_all(&four).ok();
}

#[test]
fn finished_rows_are_kept() {
    let dir = temp_dir("kept");
    build_some(&dir, &["bits-guesses-candidates"], &["salet"], 1);
    // Overwrite salet's row by hand: a run must leave a finished row alone, whatever it holds.
    let feedback = feedback();
    let row = feedback.rows.binary_search(&"salet").unwrap();
    let path = matrix_path(&dir, strategy("bits-guesses-candidates"));
    let mut file = OpenOptions::new().write(true).open(&path).unwrap();
    file.seek(SeekFrom::Start((128 + row * feedback.columns.len()) as u64)).unwrap();
    file.write_all(&vec![7; feedback.columns.len()]).unwrap();
    drop(file);
    let built = build_some(&dir, &["bits-guesses-candidates"], &["salet", "crane"], 1);
    assert_eq!(built.filled, 1);
    let cells = cells(&dir, "bits-guesses-candidates");
    assert!(row_of(&cells, "salet").iter().all(|&cell| cell == 7));
    assert_eq!(row_of(&cells, "crane"), played("bits-guesses-candidates", "crane"));
    std::fs::remove_dir_all(&dir).ok();
}

#[test]
fn an_unfinished_row_is_played_again() {
    let dir = temp_dir("unfinished");
    build_some(&dir, &["bits-guesses-candidates"], &["salet"], 1);
    // A row with a zero cell (as a crash mid-write could leave) is not finished.
    let feedback = feedback();
    let row = feedback.rows.binary_search(&"salet").unwrap();
    let path = matrix_path(&dir, strategy("bits-guesses-candidates"));
    let mut file = OpenOptions::new().write(true).open(&path).unwrap();
    file.seek(SeekFrom::Start((128 + row * feedback.columns.len() + 5) as u64)).unwrap();
    file.write_all(&[0, 9, 9]).unwrap();
    drop(file);
    assert_eq!(build_some(&dir, &["bits-guesses-candidates"], &["salet"], 1).filled, 1);
    assert_eq!(row_of(&cells(&dir, "bits-guesses-candidates"), "salet"), played("bits-guesses-candidates", "salet"));
    std::fs::remove_dir_all(&dir).ok();
}

#[test]
fn a_run_reports_its_plan_each_pass_and_each_row() {
    let dir = temp_dir("events");
    build_some(&dir, &["bits-guesses-candidates"], &["salet"], 1);
    let events = std::sync::Mutex::new(Vec::new());
    let stop = AtomicBool::new(false);
    let record = |event: Event| events.lock().unwrap().push(event);
    let options = Options {
        threads: 2,
        strategies: vec![strategy("bits-guesses-candidates"), strategy("expected-guesses-candidates")],
        openers: Some(vec!["salet".into(), "crane".into()]),
        events: &record,
        stop: &stop,
    };
    build(&dir, feedback(), options).unwrap();
    let events = events.into_inner().unwrap();
    let (bits, expected) = (strategy("bits-guesses-candidates"), strategy("expected-guesses-candidates"));
    // The plan for every Strategy comes first, then each pass from start to end.
    assert_eq!(events[0], Event::Planned { strategy: bits, finished: 1, to_fill: 1 });
    assert_eq!(events[1], Event::Planned { strategy: expected, finished: 0, to_fill: 2 });
    assert_eq!(events[2], Event::PassStarted { strategy: bits, finished: 1, to_fill: 1 });
    let crane = played("bits-guesses-candidates", "crane");
    let average = crane.iter().map(|&cell| f64::from(cell)).sum::<f64>() / crane.len() as f64;
    let losses = crane.iter().filter(|&&cell| cell > 6).count();
    assert_eq!(events[3], Event::RowDone { strategy: bits, word: "crane", done: 1, total: 1, average_guess_count: average, losses });
    assert_eq!(events[4], Event::PassEnded { strategy: bits, filled: 1, stopped: false });
    assert_eq!(events[5], Event::PassStarted { strategy: expected, finished: 0, to_fill: 2 });
    let mut words: Vec<&str> = events[6..8].iter().map(|event| if let Event::RowDone { word, .. } = event { *word } else { panic!("{event:?}") }).collect();
    words.sort();
    assert_eq!(words, ["crane", "salet"]);
    assert_eq!(events[8], Event::PassEnded { strategy: expected, filled: 2, stopped: false });
    assert_eq!(events.len(), 9);
    std::fs::remove_dir_all(&dir).ok();
}

#[test]
fn the_stop_flag_keeps_the_finished_rows() {
    let dir = temp_dir("stop");
    let stop = AtomicBool::new(false);
    let openers: Vec<String> = feedback().rows.iter().step_by(500).map(|word| word.to_string()).collect();
    let events = |event: Event| {
        if let Event::RowDone { done, .. } = event
            && done >= 3
        {
            stop.store(true, Ordering::Relaxed);
        }
    };
    let options = Options { threads: 2, strategies: vec![strategy("bits-guesses-candidates"), strategy("expected-guesses-candidates")], openers: Some(openers.clone()), events: &events, stop: &stop };
    let built = build(&dir, feedback(), options).unwrap();
    assert!(built.stopped);
    assert!(built.filled >= 3 && built.filled < openers.len());
    let cells = cells(&dir, "bits-guesses-candidates");
    let mut finished_rows = 0;
    for word in &openers {
        let row = row_of(&cells, word);
        if row.iter().any(|&cell| cell != 0) {
            assert_eq!(row, played("bits-guesses-candidates", word), "{word}");
            finished_rows += 1;
        }
    }
    assert_eq!(finished_rows, built.filled);
    // The second Strategy was never started, and the summary counts the rows finished so far.
    assert!(!matrix_path(&dir, strategy("expected-guesses-candidates")).exists());
    let summary: Value = serde_json::from_str(&std::fs::read_to_string(dir.join(SUMMARY_FILE)).unwrap()).unwrap();
    assert_eq!(summary["bits-guesses-candidates"]["complete_rows"], json!(built.filled));
    std::fs::remove_dir_all(&dir).ok();
}

#[test]
fn a_folder_copied_from_the_python_command_is_resumed() {
    // A copy of `precompute-cache/guess-counts/` differs only in the manifest's `tool`, which is not checked.
    let dir = temp_dir("from-python");
    build_some(&dir, &["bits-guesses-candidates"], &["salet"], 1);
    let manifest = std::fs::read_to_string(dir.join(MANIFEST_FILE)).unwrap();
    std::fs::write(dir.join(MANIFEST_FILE), manifest.replace(TOOL, "wordle precompute-guess-counts (python)")).unwrap();
    assert_eq!(mismatch(&dir, strategy("bits-guesses-candidates"), feedback()), None);
    let built = build_some(&dir, &["bits-guesses-candidates"], &["salet", "crane"], 1);
    assert_eq!(built.filled, 1); // salet's row was finished in the copy, so only crane is played
    let cells = cells(&dir, "bits-guesses-candidates");
    assert_eq!(row_of(&cells, "salet"), played("bits-guesses-candidates", "salet"));
    assert_eq!(row_of(&cells, "crane"), played("bits-guesses-candidates", "crane"));
    std::fs::remove_dir_all(&dir).ok();
}

#[test]
fn a_matrix_the_manifest_does_not_vouch_for_is_not_resumed() {
    let dir = temp_dir("mismatch");
    build_some(&dir, &["bits-guesses-candidates"], &["salet"], 1);
    let manifest = std::fs::read_to_string(dir.join(MANIFEST_FILE)).unwrap();
    std::fs::write(dir.join(MANIFEST_FILE), manifest.replace("\"ranked_by\":\"bits\"", "\"ranked_by\":\"expected\"")).unwrap();
    let before = std::fs::read(matrix_path(&dir, strategy("bits-guesses-candidates"))).unwrap();
    let stop = AtomicBool::new(false);
    let options = Options { threads: 1, strategies: vec![strategy("bits-guesses-candidates")], openers: None, events: &|_| {}, stop: &stop };
    match build(&dir, feedback(), options) {
        Err(BuildError::Mismatch { strategy, reason }) => {
            assert_eq!(strategy, "bits-guesses-candidates");
            assert_eq!(reason, "bits-guesses-candidates is not defined in manifest.json as it is now");
        }
        other => panic!("expected a mismatch, got {other:?}"),
    }
    assert!(std::fs::read(matrix_path(&dir, strategy("bits-guesses-candidates"))).unwrap() == before);
    std::fs::remove_dir_all(&dir).ok();
}

#[test]
fn the_manifest_keeps_other_strategies_and_lists_the_words() {
    let dir = temp_dir("manifest");
    build_some(&dir, &["bits-answers-candidates"], &["crane"], 1);
    build_some(&dir, &["expected-guesses-candidates"], &["salet"], 1);
    let text = std::fs::read_to_string(dir.join(MANIFEST_FILE)).unwrap();
    assert!(text.starts_with(concat!(
        r#"{"format_version":2,"tool":"wordle-gpui Precompute guess counts (rust)","safety_limit":12,"strategies":{"#,
        r#""bits-answers-candidates":{"name":"Expected Information, Answer List, Candidates only","pool":"answers","scope":"candidates","ranked_by":"bits","path":"bits/answers-candidates.npy"},"#,
        r#""expected-guesses-candidates":{"name":"Expected Candidates, Guess List, Candidates only","pool":"guesses","scope":"candidates","ranked_by":"expected","path":"expected/guesses-candidates.npy"}},"#,
        r#""rows":{"answers":["aback","abase","#,
    )));
    assert!(text.ends_with("\"zonal\"]}\n"));
    let manifest: Value = serde_json::from_str(&text).unwrap();
    assert_eq!(manifest["rows"]["answers"].as_array().unwrap().len(), 2315);
    assert_eq!(manifest["rows"]["guesses"].as_array().unwrap().len(), 14855);
    assert_eq!(manifest["rows"]["guesses"][0], "aahed");
    assert_eq!(manifest["columns"], manifest["rows"]["answers"]);
    std::fs::remove_dir_all(&dir).ok();
}

/// A version 1 folder, as the gpui app and the Python command wrote it before version 2: a flat
/// `bits-candidates.npy` of every Guess List row, and its manifest.
fn write_version_1_folder(dir: &Path) {
    let feedback = feedback();
    let mut cells = vec![0u8; feedback.rows.len() * feedback.columns.len()];
    let salet = feedback.rows.binary_search(&"salet").unwrap();
    cells[salet * feedback.columns.len()..(salet + 1) * feedback.columns.len()].copy_from_slice(&played("bits-guesses-candidates", "salet"));
    let mut bytes = npy_header(feedback.rows.len(), feedback.columns.len());
    bytes.extend(cells);
    std::fs::write(dir.join("bits-candidates.npy"), bytes).unwrap();
    let manifest = json!({
        "format_version": 1,
        "tool": "wordle-gpui Precompute guess counts (rust)",
        "safety_limit": SAFETY_LIMIT,
        "strategies": {"bits-candidates": {"name": "Expected Information, Candidates only", "pool": "answers", "scope": "candidates", "ranked_by": "bits"}},
        "rows": feedback.rows,
        "columns": feedback.columns,
    });
    std::fs::write(dir.join(MANIFEST_FILE), serde_json::to_string(&manifest).unwrap() + "\n").unwrap();
}

#[test]
fn a_version_1_folder_is_refused_before_anything_is_written() {
    let dir = temp_dir("version-1");
    write_version_1_folder(&dir);
    let before = files(&dir);
    let reason = "manifest.json was written by format version 1; migrate it with `just migrate-guess-counts`";
    assert_eq!(folder_mismatch(&dir).as_deref(), Some(reason));
    assert_eq!(mismatch(&dir, strategy("bits-answers-all"), feedback()).as_deref(), Some(reason));
    // Even a Strategy with no rows yet: the version 1 manifest must not be overwritten before it is migrated.
    let stop = AtomicBool::new(false);
    let options = Options { threads: 1, strategies: vec![strategy("bits-answers-all")], openers: Some(vec!["crane".into()]), events: &|_| {}, stop: &stop };
    match build(&dir, feedback(), options) {
        Err(error @ BuildError::Folder(_)) => assert_eq!(error.to_string(), format!("can't use guess-counts/: {reason}")),
        other => panic!("expected the folder to be refused, got {other:?}"),
    }
    assert!(files(&dir) == before, "nothing was written");
    std::fs::remove_dir_all(&dir).ok();
}

#[test]
fn the_summary_ranks_by_average_then_bits_then_word() {
    let feedback = feedback();
    let columns = feedback.columns.len();
    let mut cells = vec![0u8; feedback.rows.len() * columns];
    let mut fill = |word: &str, counts: &[(usize, u8)], rest: u8| {
        let row = feedback.rows.binary_search(&word).unwrap();
        let cells = &mut cells[row * columns..(row + 1) * columns];
        cells.fill(rest);
        for &(column, count) in counts {
            cells[column] = count;
        }
    };
    fill("salet", &[(0, 7), (1, 13), (2, 2)], 4); // two Losses
    fill("crane", &[(0, 2), (1, 6)], 4); // the same total as roate, fewer bits
    fill("roate", &[(0, 6), (1, 2)], 4);
    fill("aahed", &[], 3); // the best
    fill("zymic", &[(9, 0)], 3); // a zero cell: unfinished, left out
    fill("aalii", &[], 5); // same total and (by hand) the same bits as aargh: alphabetical
    fill("aargh", &[], 5);
    let bits = |word: &str| match word {
        "crane" => 5.7,
        "roate" => 5.9,
        _ => 5.0,
    };
    let entries = summarize(&cells, &feedback.rows, &feedback.columns, &mut |word| bits(word));
    let words: Vec<&str> = entries.iter().map(|entry| entry.word).collect();
    assert_eq!(words, ["aahed", "roate", "crane", "salet", "aalii", "aargh"]);
    assert_eq!(entries.iter().map(|entry| entry.rank).collect::<Vec<_>>(), [1, 2, 3, 4, 5, 6]);
    let salet = &entries[3];
    assert_eq!(salet.average_guess_count, (7 + 13 + 2 + 4 * (columns - 3)) as f64 / columns as f64);
    assert_eq!(salet.losses, 2);
    assert_eq!(salet.distribution, [0, 1, 0, columns - 3, 0, 0]);
    assert!(salet.is_answer == feedback.columns.contains(&"salet"));
    assert!(entries[0].is_answer == feedback.columns.contains(&"aahed"));
    assert!(entries.iter().find(|entry| entry.word == "crane").unwrap().is_answer);
}

#[test]
fn the_summary_files_are_written_as_python_writes_them() {
    let entry = Entry { rank: 1, word: "salet", average_guess_count: 3.52829373650108, losses: 8, distribution: [0, 148, 1030, 946, 157, 26], bits: 5.834581525865648, is_answer: false };
    let whole = Entry { rank: 2, word: "crane", average_guess_count: 4.0, is_answer: true, ..entry.clone() };
    assert_eq!(
        ranking_csv(&[entry.clone(), whole]),
        "rank,opener,average_guess_count,losses,won_in_1,won_in_2,won_in_3,won_in_4,won_in_5,won_in_6,bits,is_answer\r\n\
         1,salet,3.52829373650108,8,0,148,1030,946,157,26,5.834581525865648,False\r\n\
         2,crane,4.0,8,0,148,1030,946,157,26,5.834581525865648,True\r\n"
    );
    assert_eq!(
        serde_json::to_string(&entry_json(&entry)).unwrap(),
        r#"{"rank":1,"word":"salet","average_guess_count":3.52829373650108,"losses":8,"distribution":[0,148,1030,946,157,26],"bits":5.834581525865648,"is_answer":false}"#
    );
}

/// The Python command's folder to compare with: `WORDLE_PYTHON_GUESS_COUNTS` if set, or else
/// `precompute-cache/guess-counts/`, if its manifest says Python wrote it. A small one is quick to
/// make (see `docs/documents/guess-count-matrix.md`): every Strategy for a few Openers, such as
/// `guess_count_matrix.build(out, openers=["salet", "crane", "aback", "zonal"], threads=4)`.
fn python_reference() -> Option<PathBuf> {
    let dir = std::env::var_os("WORDLE_PYTHON_GUESS_COUNTS").map_or_else(default_dir, PathBuf::from);
    let manifest = read_manifest(&dir)?;
    manifest["tool"].as_str()?.ends_with("(python)").then_some(dir)
}

/// The Python folder given on purpose with `WORDLE_PYTHON_GUESS_COUNTS` (the shared one may be mid-run).
fn python_reference_given() -> Option<PathBuf> {
    std::env::var_os("WORDLE_PYTHON_GUESS_COUNTS").map(PathBuf::from).filter(|_| python_reference().is_some())
}

#[test]
fn rows_equal_the_python_commands_rows() {
    let Some(dir) = python_reference() else {
        eprintln!("skipped: no guess counts written by the Python command");
        return;
    };
    let feedback = feedback();
    let columns = feedback.columns.len();
    let mut player = Player::new(feedback);
    let mut compared = Vec::new();
    for strategy in &STRATEGIES {
        if mismatch(&dir, strategy, feedback).is_some() {
            continue;
        }
        let Some(cells) = read_matrix(&dir, strategy, feedback).unwrap() else { continue };
        let words = pool_words(feedback, strategy.set);
        let finished_rows: Vec<usize> = (0..words.len()).filter(|&row| finished(&cells[row * columns..(row + 1) * columns])).collect();
        // A few rows spread over the finished ones (all of them if there are few).
        let step = (finished_rows.len() / 6).max(1);
        for &row in finished_rows.iter().step_by(step) {
            let counts = player.guess_counts(strategy, player.row_of(words[row]).unwrap(), None).unwrap();
            assert!(counts[..] == cells[row * columns..(row + 1) * columns], "{} {}", strategy.id, words[row]);
        }
        compared.push(format!("{} ({} rows)", strategy.id, finished_rows.iter().step_by(step).count()));
    }
    eprintln!("compared {} with {}", compared.join(", "), dir.display());
    if python_reference_given().is_some() {
        assert_eq!(compared.len(), STRATEGIES.len(), "the folder given has rows of every Strategy");
    }
}

#[test]
fn the_summary_equals_the_python_commands_summary() {
    let Some(dir) = python_reference_given() else {
        eprintln!("skipped: set WORDLE_PYTHON_GUESS_COUNTS to a folder the Python command wrote");
        return;
    };
    let copy = temp_dir("python-summary");
    copy_files(&dir, &copy, &["npy", "json"]);
    std::fs::remove_file(copy.join(SUMMARY_FILE)).unwrap();
    let paths = write_summary(&copy, feedback()).unwrap();
    assert_eq!(paths.len(), STRATEGIES.len() + 1, "a CSV for every Strategy, then the summary");
    for path in paths {
        let name = path.strip_prefix(&copy).unwrap();
        assert!(std::fs::read(&path).unwrap() == std::fs::read(dir.join(name)).unwrap(), "{} differs", name.display());
    }
    std::fs::remove_dir_all(&copy).ok();
}

#[test]
fn a_folder_the_python_command_wrote_is_resumed_with_the_same_bytes() {
    let Some(dir) = python_reference_given() else {
        eprintln!("skipped: set WORDLE_PYTHON_GUESS_COUNTS to a folder the Python command wrote");
        return;
    };
    let copy = temp_dir("python-resume");
    copy_files(&dir, &copy, &["npy", "json"]);
    let feedback = feedback();
    let columns = feedback.columns.len();
    // Clear the first finished row of each Strategy's matrix, as a stop mid-run would leave it.
    let mut cleared = Vec::new();
    for strategy in &STRATEGIES {
        let cells = read_matrix(&copy, strategy, feedback).unwrap().unwrap();
        let row = (0..cells.len() / columns).find(|&row| finished(&cells[row * columns..(row + 1) * columns])).unwrap();
        let mut file = OpenOptions::new().write(true).open(matrix_path(&copy, strategy)).unwrap();
        file.seek(SeekFrom::Start((128 + row * columns) as u64)).unwrap();
        file.write_all(&vec![0; columns]).unwrap();
        cleared.push(pool_words(feedback, strategy.set)[row]);
    }
    cleared.sort_unstable();
    cleared.dedup();
    let stop = AtomicBool::new(false);
    let options = Options { threads: 4, strategies: STRATEGIES.iter().collect(), openers: Some(cleared.iter().map(|word| word.to_string()).collect()), events: &|_| {}, stop: &stop };
    let built = build(&copy, feedback, options).unwrap();
    assert_eq!(built.filled, STRATEGIES.len(), "only the cleared rows are played");
    // Every file is Python's again, byte for byte, but the manifest's `tool`.
    let theirs = files(&dir);
    let ours = files(&copy);
    assert_eq!(theirs.iter().map(|(name, _)| name).collect::<Vec<_>>(), ours.iter().map(|(name, _)| name).collect::<Vec<_>>());
    for ((name, theirs), (_, ours)) in theirs.iter().zip(&ours) {
        if name == Path::new(MANIFEST_FILE) {
            let theirs = String::from_utf8(theirs.clone()).unwrap().replace("wordle precompute-guess-counts (python)", TOOL);
            assert!(theirs.as_bytes() == &ours[..], "{} differs in more than `tool`", name.display());
        } else {
            assert!(theirs == ours, "{} differs", name.display());
        }
    }
    std::fs::remove_dir_all(&copy).ok();
}

/// Times a real build, for the cost figures in `docs/documents/guess-count-matrix.md`:
/// `GUESS_COUNTS_OUT=<empty folder> GUESS_COUNTS_STRATEGY=bits-guesses-all GUESS_COUNTS_STEP=150
/// GUESS_COUNTS_THREADS=8 cargo test --release -- --ignored --nocapture measure_a_build`
/// plays every `STEP`th Opener (every one without `STEP`).
#[test]
#[ignore]
fn measure_a_build() {
    let var = |name: &str| std::env::var(name).ok();
    let dir = PathBuf::from(var("GUESS_COUNTS_OUT").expect("set GUESS_COUNTS_OUT"));
    let id = var("GUESS_COUNTS_STRATEGY").unwrap_or("bits-guesses-candidates".into());
    let threads = var("GUESS_COUNTS_THREADS").map_or(8, |threads| threads.parse().unwrap());
    let step = var("GUESS_COUNTS_STEP").map_or(1, |step| step.parse().unwrap());
    let openers = (step > 1).then(|| pool_words(feedback(), strategy(&id).set).iter().step_by(step).map(|word| word.to_string()).collect());
    let stop = AtomicBool::new(false);
    let started = Instant::now();
    let options = Options { threads, strategies: vec![strategy(&id)], openers, events: &|_| {}, stop: &stop };
    let built = build(&dir, feedback(), options).unwrap();
    let seconds = started.elapsed().as_secs_f64();
    eprintln!("{id}: {} rows on {threads} threads in {seconds:.1}s, {:.3}s a row", built.filled, seconds / built.filled.max(1) as f64);
}
