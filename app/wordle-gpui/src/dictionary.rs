//! Look a word up in the Oxford Learner's Dictionaries, scraped from oxfordlearnersdictionaries.com.
//! A Rust port of the Oxford source in `D:\code\dictionary-tui` (`src/lib/sources/oxford.py`).
//! `lookup` blocks, so the app runs it on gpui's background executor.

use std::time::Duration;

use scraper::{ElementRef, Html, Selector};
use ureq::ResponseExt;

const BASE_URL: &str = "https://www.oxfordlearnersdictionaries.com";
/// The site turns away requests that don't look like a browser.
const USER_AGENT: &str = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";

#[derive(Debug, Clone, PartialEq)]
pub struct Sense {
    pub definition: String,
    pub examples: Vec<String>,
    /// A short label grouping senses, e.g. "GO QUICKLY".
    pub signpost: Option<String>,
    /// The CEFR level, e.g. "A1".
    pub level: Option<String>,
    /// Grammar notes and usage labels, e.g. "[intransitive]".
    pub labels: Vec<String>,
}

/// One headword under one part of speech: "crane" the noun and "crane" the verb are two Entries.
#[derive(Debug, Clone, PartialEq)]
pub struct Entry {
    pub headword: String,
    pub pos: Option<String>,
    /// (region, pronunciation) pairs, e.g. ("BrE", "/kreɪn/").
    pub phonetics: Vec<(String, String)>,
    pub senses: Vec<Sense>,
    pub url: String,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Lookup {
    Found(Vec<Entry>),
    /// No entry, but the site suggested these spellings.
    Suggestions(Vec<String>),
    NotFound,
}

pub fn lookup(word: &str) -> Result<Lookup, String> {
    let agent: ureq::Agent =
        ureq::Agent::config_builder().user_agent(USER_AGENT).timeout_global(Some(Duration::from_secs(15))).build().into();
    let search = format!("{BASE_URL}/search/english/?q={word}");
    let Some((url, html)) = fetch(&agent, &search)? else { return Ok(Lookup::NotFound) };

    if url.contains("/spellcheck/") {
        return Ok(Lookup::Suggestions(parse_suggestions(&html)));
    }
    let Some(main) = parse_entry(&html, &url) else { return Ok(Lookup::NotFound) };

    let mut entries = vec![main];
    for sibling in parse_sibling_urls(&html) {
        if let Some((url, html)) = fetch(&agent, &sibling)?
            && let Some(entry) = parse_entry(&html, &url)
        {
            entries.push(entry);
        }
    }
    Ok(Lookup::Found(entries))
}

/// The page at `url` after redirects, and the URL it ended up at. `None` for a 404.
fn fetch(agent: &ureq::Agent, url: &str) -> Result<Option<(String, String)>, String> {
    match agent.get(url).call() {
        Ok(mut response) => {
            let url = response.get_uri().to_string();
            let html = response.body_mut().read_to_string().map_err(|e| e.to_string())?;
            Ok(Some((url, html)))
        }
        Err(ureq::Error::StatusCode(404)) => Ok(None),
        Err(error) => Err(format!("Couldn't reach the Oxford dictionary: {error}")),
    }
}

fn selector(css: &str) -> Selector {
    Selector::parse(css).expect("a valid selector")
}

/// The element's text, with runs of whitespace squeezed to one space. `None` if it's empty.
fn text(element: ElementRef) -> Option<String> {
    let text = element.text().collect::<Vec<_>>().join(" ").split_whitespace().collect::<Vec<_>>().join(" ");
    (!text.is_empty()).then_some(text)
}

fn first_text(element: ElementRef, css: &str) -> Option<String> {
    element.select(&selector(css)).next().and_then(text)
}

fn has_class(element: ElementRef, tag: &str, class: &str) -> bool {
    element.value().name() == tag && element.value().has_class(class, scraper::CaseSensitivity::CaseSensitive)
}

/// The nearest ancestor that is a `<tag class="class">`.
fn ancestor<'a>(element: ElementRef<'a>, tag: &str, class: &str) -> Option<ElementRef<'a>> {
    element.ancestors().filter_map(ElementRef::wrap).find(|parent| has_class(*parent, tag, class))
}

fn parse_sense(li: ElementRef) -> Option<Sense> {
    let definition = first_text(li, "span.def").or_else(|| first_text(li, "span.xrefs"))?;
    let examples = li
        .select(&selector("ul.examples > li"))
        .filter_map(|example| {
            // An example sentence, after its pattern if it has one (e.g. "+ adj.").
            let parts: Vec<_> = [first_text(example, "span.cf"), first_text(example, "span.x")].into_iter().flatten().collect();
            (!parts.is_empty()).then(|| parts.join(" "))
        })
        .collect();
    let signpost = ancestor(li, "span", "shcut-g").and_then(|group| first_text(group, "h2.shcut"));
    let labels = li
        .select(&selector("span.grammar, span.labels"))
        .filter(|label| ancestor(*label, "ul", "examples").is_none())
        .filter_map(text)
        .collect();
    let level = li.value().attr("cefr").map(str::to_uppercase);
    Some(Sense { definition, examples, signpost, level, labels })
}

pub fn parse_entry(html: &str, url: &str) -> Option<Entry> {
    let document = Html::parse_document(html);
    let entry = document.select(&selector("div.entry")).next()?;
    let top = entry.select(&selector("div.top-container")).next().unwrap_or(entry);
    let headword = first_text(top, ".headword")?;

    // The entry's own senses, skipping the ones nested under idioms.
    let senses = entry
        .select(&selector("ol.senses_multiple li.sense, ol.sense_single li.sense"))
        .filter(|li| ancestor(*li, "div", "idioms").is_none())
        .filter_map(parse_sense)
        .collect();

    let phonetics = [("BrE", "div.phons_br span.phon"), ("NAmE", "div.phons_n_am span.phon")]
        .into_iter()
        .filter_map(|(region, css)| first_text(top, css).map(|phon| (region.to_string(), phon)))
        .collect();

    Some(Entry { headword, pos: first_text(top, "span.pos"), phonetics, senses, url: url.to_string() })
}

/// Links to the same headword under other parts of speech (e.g. crane_1 noun -> crane_2 verb).
fn parse_sibling_urls(html: &str) -> Vec<String> {
    let document = Html::parse_document(html);
    let arl1 = selector("span.arl1");
    document
        .select(&selector("#relatedentries a"))
        .filter(|a| a.select(&arl1).next().is_some())
        .filter_map(|a| a.value().attr("href").map(str::to_string))
        .collect()
}

fn parse_suggestions(html: &str) -> Vec<String> {
    let document = Html::parse_document(html);
    let mut words: Vec<String> = Vec::new();
    for word in document.select(&selector("ul.result-list a")).filter_map(text) {
        if !words.contains(&word) {
            words.push(word);
        }
    }
    words
}

#[cfg(test)]
mod tests {
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
}
