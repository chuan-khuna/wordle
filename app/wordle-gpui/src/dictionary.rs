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
#[path = "dictionary_tests.rs"]
mod tests;
