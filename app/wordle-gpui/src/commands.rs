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
    Precompute,
    ResetLayout,
}

impl Command {
    /// In menu order.
    pub const ALL: [Command; 10] = [
        Command::Reset,
        Command::Restart,
        Command::PlaySeed,
        Command::CopySeed,
        Command::ToggleUnlimited,
        Command::ToggleLiveHints,
        Command::ToggleSidebar,
        Command::ChangeTheme,
        Command::Precompute,
        Command::ResetLayout,
    ];

    pub fn label(self) -> &'static str {
        match self {
            Command::Reset => "Play a new word",
            Command::Restart => "Try this word again",
            Command::PlaySeed => "Play a seed…",
            Command::CopySeed => "Copy seed",
            Command::ToggleUnlimited => "Unlimited guesses",
            Command::ToggleLiveHints => "Live hints",
            Command::ToggleSidebar => "Show sidebar",
            Command::ChangeTheme => "Change theme…",
            Command::Precompute => "Precompute matrices…",
            Command::ResetLayout => "Reset layout",
        }
    }

    /// Commands in the same group sit together; the menu draws a line between groups.
    pub fn group(self) -> u8 {
        match self {
            Command::Reset | Command::Restart | Command::PlaySeed | Command::CopySeed => 0,
            Command::ToggleUnlimited | Command::ToggleLiveHints => 1,
            Command::ToggleSidebar | Command::ChangeTheme | Command::ResetLayout => 2,
            Command::Precompute => 3,
        }
    }

    /// The commands whose label matches `query` (see `search::matches`), in menu order.
    pub fn search(query: &str) -> Vec<Command> {
        Command::ALL.into_iter().filter(|command| crate::search::matches(query, command.label())).collect()
    }
}

/// A seed with its digits in groups of three from the right ("365176" is "365 176"), to be easier to read.
pub fn group_digits(digits: &str) -> String {
    let mut grouped = String::new();
    for (index, digit) in digits.chars().enumerate() {
        if index > 0 && (digits.len() - index) % 3 == 0 {
            grouped.push(' ');
        }
        grouped.push(digit);
    }
    grouped
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

    /// Pasted text: its digits go in, as if typed, so "seed 4821" pastes as 4821.
    pub fn paste(&mut self, text: &str) {
        for digit in text.chars().filter(char::is_ascii_digit) {
            self.press(&digit.to_string());
        }
    }

    pub fn hint(&self) -> String {
        if self.digits.is_empty() { format!("Type 0 to {}", group_digits(&MAX_SEED.to_string())) } else { "Enter to play · Esc to go back".into() }
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

    /// Pasted text goes to the seed field if it shows, or else to the query.
    pub fn paste(&mut self, text: &str) {
        match self.seed.as_mut() {
            Some(field) => field.paste(text),
            None => {
                self.query.extend(text.chars().filter(|c| !c.is_control()));
                self.selected = 0;
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
#[path = "commands_tests.rs"]
mod tests;
