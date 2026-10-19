//! The commands behind the settings menu and the command palette, and the palette's state,
//! testable without a window. The palette (⌘P, Ctrl+P elsewhere) lists the same commands as the
//! menu: type to filter, Up and Down to move, Enter to run, Escape to close.

use wordle_gpui::rules::game::MAX_SEED;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Command {
    Reset,
    Restart,
    PlaySeed,
    CopySeed,
    ToggleUnlimited,
    ToggleLiveHints,
    ToggleSidebar,
    ChangeTheme,
}

impl Command {
    /// In menu order.
    pub const ALL: [Command; 8] = [
        Command::Reset,
        Command::Restart,
        Command::PlaySeed,
        Command::CopySeed,
        Command::ToggleUnlimited,
        Command::ToggleLiveHints,
        Command::ToggleSidebar,
        Command::ChangeTheme,
    ];

    pub fn label(self) -> &'static str {
        match self {
            Command::Reset => "Reset game",
            Command::Restart => "Restart game",
            Command::PlaySeed => "Play a seed…",
            Command::CopySeed => "Copy seed",
            Command::ToggleUnlimited => "Unlimited guesses",
            Command::ToggleLiveHints => "Live hints",
            Command::ToggleSidebar => "Show sidebar",
            Command::ChangeTheme => "Change theme…",
        }
    }

    /// Commands in the same group sit together; the menu draws a line between groups.
    pub fn group(self) -> u8 {
        match self {
            Command::Reset | Command::Restart | Command::PlaySeed | Command::CopySeed => 0,
            Command::ToggleUnlimited | Command::ToggleLiveHints => 1,
            Command::ToggleSidebar | Command::ChangeTheme => 2,
        }
    }

    /// The commands whose label matches `query` (see `search::matches`), in menu order.
    pub fn search(query: &str) -> Vec<Command> {
        Command::ALL.into_iter().filter(|command| crate::search::matches(query, command.label())).collect()
    }
}

/// The digits typed into a seed field, in the menu or the palette.
#[derive(Default)]
pub struct SeedField {
    pub digits: String,
}

/// What a key press in a seed field asks the app to do.
#[derive(Debug, PartialEq)]
pub enum SeedOutcome {
    Play(u32),
    /// Go back to the list of commands.
    Cancel,
    None,
}

impl SeedField {
    /// Digits, Backspace, Enter (play that Seed) and Escape (go back).
    pub fn press(&mut self, key: &str) -> SeedOutcome {
        match key {
            // At most six digits, so any Seed typed is within 0..=MAX_SEED.
            "enter" => self.digits.parse().map_or(SeedOutcome::None, SeedOutcome::Play),
            "escape" => SeedOutcome::Cancel,
            "backspace" => {
                self.digits.pop();
                SeedOutcome::None
            }
            _ if key.len() == 1 && key.chars().all(|c| c.is_ascii_digit()) && self.digits.len() < MAX_SEED.to_string().len() => {
                self.digits.push_str(key);
                SeedOutcome::None
            }
            _ => SeedOutcome::None,
        }
    }

    pub fn hint(&self) -> String {
        if self.digits.is_empty() { format!("Type 0 to {MAX_SEED}") } else { "Enter to play · Esc to go back".into() }
    }
}

#[derive(Default)]
pub struct CommandPalette {
    pub query: String,
    /// Which of the matches is highlighted.
    pub selected: usize,
    /// The seed field that replaces the list after "Play a seed…".
    pub seed: Option<SeedField>,
}

/// What a key press or click in the palette asks the app to do.
#[derive(Debug, PartialEq)]
pub enum Outcome {
    /// Close the palette and run this command. Never `PlaySeed`: the palette handles that itself.
    Run(Command),
    /// Close the palette and play this Seed.
    PlaySeed(u32),
    Close,
    /// Nothing to change, apart from the palette itself.
    None,
}

impl CommandPalette {
    pub fn matches(&self) -> Vec<Command> {
        Command::search(&self.query)
    }

    /// `key` is gpui's name for the key ("up", "enter", "a"); `typed` is the text it types, if any.
    pub fn press(&mut self, key: &str, typed: Option<&str>) -> Outcome {
        if let Some(field) = self.seed.as_mut() {
            return match field.press(key) {
                SeedOutcome::Play(seed) => Outcome::PlaySeed(seed),
                SeedOutcome::Cancel => {
                    self.seed = None;
                    Outcome::None
                }
                SeedOutcome::None => Outcome::None,
            };
        }
        let matches = self.matches();
        let count = matches.len();
        match key {
            "escape" => Outcome::Close,
            "enter" => matches.get(self.selected).map_or(Outcome::None, |command| self.choose(*command)),
            "up" | "down" if count > 0 => {
                self.selected = if key == "down" { (self.selected + 1) % count } else { (self.selected + count - 1) % count };
                Outcome::None
            }
            "backspace" => {
                self.query.pop();
                self.selected = 0;
                Outcome::None
            }
            _ => {
                if let Some(text) = typed.filter(|text| !text.chars().any(char::is_control)) {
                    self.query.push_str(text);
                    self.selected = 0;
                }
                Outcome::None
            }
        }
    }

    /// Run `command`, as Enter on it or a click does. "Play a seed…" opens the seed field instead.
    pub fn choose(&mut self, command: Command) -> Outcome {
        if command == Command::PlaySeed {
            self.seed = Some(SeedField::default());
            Outcome::None
        } else {
            Outcome::Run(command)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn type_text(palette: &mut CommandPalette, text: &str) {
        for c in text.chars() {
            palette.press(&c.to_string(), Some(&c.to_string()));
        }
    }

    #[test]
    fn search_filters_by_label() {
        assert_eq!(Command::search("theme"), [Command::ChangeTheme]);
        assert_eq!(Command::search("game"), [Command::Reset, Command::Restart]);
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
        type_text(&mut palette, "game");
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
    fn an_empty_seed_field_plays_nothing() {
        assert_eq!(SeedField::default().press("enter"), SeedOutcome::None);
    }
}
