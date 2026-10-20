use super::*;

fn type_text(palette: &mut CommandPalette, text: &str) {
    for c in text.chars() {
        palette.press(&c.to_string(), Some(&c.to_string()));
    }
}

#[test]
fn search_filters_by_label() {
    assert_eq!(Command::search("theme"), [Command::ChangeTheme]);
    assert_eq!(Command::search("word"), [Command::Reset, Command::Restart]);
    assert_eq!(Command::search("").len(), Command::ALL.len());
}

#[test]
fn enter_runs_the_selected_command() {
    let mut palette = CommandPalette::default();
    assert_eq!(palette.press("enter", None), Outcome::Run(Command::Reset));
    palette.press("down", None);
    assert_eq!(palette.press("enter", None), Outcome::Run(Command::Restart));
}

#[test]
fn typing_selects_the_first_match_and_up_wraps() {
    let mut palette = CommandPalette::default();
    type_text(&mut palette, "word");
    palette.press("up", None);
    assert_eq!(palette.press("enter", None), Outcome::Run(Command::Restart));
}

#[test]
fn play_a_seed_opens_a_seed_field() {
    let mut palette = CommandPalette::default();
    type_text(&mut palette, "seed");
    assert_eq!(palette.press("enter", None), Outcome::None);
    type_text(&mut palette, "42x");
    assert_eq!(palette.press("enter", None), Outcome::PlaySeed(42));
}

#[test]
fn escape_leaves_the_seed_field_then_closes() {
    let mut palette = CommandPalette::default();
    palette.choose(Command::PlaySeed);
    assert_eq!(palette.press("escape", None), Outcome::None);
    assert!(palette.seed.is_none());
    assert_eq!(palette.press("escape", None), Outcome::Close);
}

#[test]
fn a_seed_field_takes_at_most_six_digits() {
    let mut field = SeedField::default();
    for key in "12345678".chars() {
        field.press(&key.to_string());
    }
    assert_eq!(field.press("enter"), SeedOutcome::Play(123_456));
}

#[test]
fn pasting_keeps_the_digits() {
    let mut field = SeedField::default();
    field.paste(" seed 4821\n");
    assert_eq!(field.press("enter"), SeedOutcome::Play(4821));

    let mut palette = CommandPalette::default();
    palette.choose(Command::PlaySeed);
    palette.paste("12345678");
    assert_eq!(palette.press("enter", None), Outcome::PlaySeed(123_456));
}

#[test]
fn an_empty_seed_field_plays_nothing() {
    assert_eq!(SeedField::default().press("enter"), SeedOutcome::None);
}

#[test]
fn seeds_are_shown_in_groups_of_three_from_the_right() {
    assert_eq!(group_digits(""), "");
    assert_eq!(group_digits("7"), "7");
    assert_eq!(group_digits("52826"), "52 826");
    assert_eq!(group_digits("365176"), "365 176");
}

#[test]
fn reset_layout_is_in_the_palette() {
    assert_eq!(Command::search("layout"), [Command::ResetLayout]);
}

#[test]
fn precompute_is_in_the_palette() {
    assert_eq!(Command::search("matri"), [Command::Precompute]);
}
