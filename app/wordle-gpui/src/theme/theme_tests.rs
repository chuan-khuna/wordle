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
    assert_eq!(names("light"), ["Rosé Pine Dawn", "Catppuccin Latte"]);
}
