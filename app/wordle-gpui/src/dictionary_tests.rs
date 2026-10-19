use super::*;

const ENTRY: &str = r#"<html><body><div class="entry">
    <div class="top-container">
        <h1 class="headword">crane</h1> <span class="pos">noun</span>
        <div class="phons_br"><span class="phon">/kreɪn/</span></div>
        <div class="phons_n_am"><span class="phon">/kreɪn/</span></div>
    </div>
    <ol class="senses_multiple">
        <li class="sense" cefr="c1"><span class="grammar">[countable]</span>
            <span class="def">a tall machine with a long arm, used to lift and move heavy objects</span>
            <ul class="examples"><li><span class="x">The crane lifted the  container.</span></li></ul>
        </li>
        <li class="sense"><span class="def">a large bird with long legs</span></li>
    </ol>
    <div class="idioms"><ol class="sense_single"><li class="sense"><span class="def">an idiom's sense</span></li></ol></div>
</div>
<div id="relatedentries"><a href="https://example.com/crane_2"><span class="arl1">crane</span> verb</a></div>
</body></html>"#;

#[test]
fn parses_the_headword_pronunciations_and_senses() {
    let entry = parse_entry(ENTRY, "https://example.com/crane_1").unwrap();
    assert_eq!(entry.headword, "crane");
    assert_eq!(entry.pos.as_deref(), Some("noun"));
    assert_eq!(entry.phonetics, [("BrE".into(), "/kreɪn/".into()), ("NAmE".into(), "/kreɪn/".into())]);
    assert_eq!(entry.senses.len(), 2, "skips the idiom's sense");
    let first = &entry.senses[0];
    assert_eq!(first.level.as_deref(), Some("C1"));
    assert_eq!(first.labels, ["[countable]"]);
    assert_eq!(first.examples, ["The crane lifted the container."]);
}

#[test]
fn finds_the_other_parts_of_speech() {
    assert_eq!(parse_sibling_urls(ENTRY), ["https://example.com/crane_2"]);
}

#[test]
fn parses_spelling_suggestions_once_each() {
    let html = r#"<ul class="result-list"><li><a>crane</a></li><li><a>crane</a></li><li><a>crank</a></li></ul>"#;
    assert_eq!(parse_suggestions(html), ["crane", "crank"]);
}

/// Reaches the real site, so it only runs with `cargo test -- --ignored`.
#[test]
#[ignore]
fn looks_up_a_real_word() {
    let Lookup::Found(entries) = lookup("crane").unwrap() else { panic!("no entry") };
    assert!(entries.iter().any(|entry| entry.pos.as_deref() == Some("noun")));
    assert!(!entries[0].senses.is_empty());
}
