use super::*;

fn names(query: &str) -> Vec<&'static str> {
    search(query).iter().map(|theme| theme.name).collect()
}

#[test]
fn an_empty_query_lists_every_theme() {
    assert_eq!(names("").len(), THEMES.len());
}

#[test]
fn search_ignores_case_and_accents() {
    assert_eq!(names("ROSE"), ["Rosé Pine", "Rosé Pine Dawn"]);
    assert_eq!(names("rosé dawn"), ["Rosé Pine Dawn"]);
}

#[test]
fn search_matches_letters_in_order() {
    assert_eq!(names("cmo"), ["Catppuccin Mocha"]);
    assert_eq!(names("latte"), ["Catppuccin Latte"]);
    assert!(names("xyz").is_empty());
}

#[test]
fn search_finds_themes_by_appearance() {
    assert_eq!(names("light"), ["Rosé Pine Dawn", "Catppuccin Latte", "Flexoki Light"]);
}

#[test]
fn search_finds_flexoki() {
    assert_eq!(names("flex"), ["Flexoki Dark", "Flexoki Light"]);
    assert_eq!(names("flexoki dark"), ["Flexoki Dark"]);
}

#[test]
fn search_finds_the_newer_themes() {
    assert_eq!(names("tokyo"), ["Tokyo Night"]);
    assert_eq!(names("everforest"), ["Everforest"]);
    assert_eq!(names("kanagawa"), ["Kanagawa"]);
    assert_eq!(names("nord"), ["Nord"]);
}

#[test]
fn themes_are_grouped_dark_first_then_light() {
    let first_light = THEMES.iter().position(|theme| !theme.dark).unwrap();
    assert!(THEMES[..first_light].iter().all(|theme| theme.dark));
    assert!(THEMES[first_light..].iter().all(|theme| !theme.dark));
}
