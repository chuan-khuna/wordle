//! The colour themes, and the search behind the theme picker. `picker` is the picker's state.
//!
//! Each theme is in its own file and maps its palette onto the same roles. To add one, add a file
//! and list it in `THEMES`.

use wordle_gpui::rules::feedback::Mark;

mod catppuccin_latte;
mod catppuccin_mocha;
pub mod picker;
mod rose_pine;
mod rose_pine_dawn;

pub use catppuccin_latte::CATPPUCCIN_LATTE;
pub use catppuccin_mocha::CATPPUCCIN_MOCHA;
pub use rose_pine::ROSE_PINE;
pub use rose_pine_dawn::ROSE_PINE_DAWN;

/// A fill and the colour of the letter drawn on it.
pub type Paint = (u32, u32);

#[derive(Debug, PartialEq)]
pub struct Theme {
    pub name: &'static str,
    pub dark: bool,
    /// The window behind everything.
    pub background: u32,
    /// The title bar, menus and the theme picker.
    pub surface: u32,
    /// Buttons, separators, hovered menu rows.
    pub overlay: u32,
    pub highlight_low: u32,
    /// Menu borders, empty tile borders, keys not guessed yet.
    pub highlight_med: u32,
    pub highlight_high: u32,
    pub text: u32,
    pub subtle: u32,
    pub muted: u32,
    pub correct: Paint,
    pub present: Paint,
    pub absent: Paint,
    /// An Absent key on the keyboard. Dark themes fade it into the background, so the letters still in play stand out.
    pub absent_key: Paint,
    pub heading: u32,
    pub error: u32,
    pub success: u32,
    /// The caret and the border of a focused field.
    pub accent: u32,
}

impl Theme {
    pub fn mark(&self, mark: Mark) -> Paint {
        match mark {
            Mark::Correct => self.correct,
            Mark::Present => self.present,
            Mark::Absent => self.absent,
        }
    }

    pub fn appearance(&self) -> &'static str {
        if self.dark { "Dark" } else { "Light" }
    }
}

pub static THEMES: [&Theme; 4] = [&ROSE_PINE, &ROSE_PINE_DAWN, &CATPPUCCIN_MOCHA, &CATPPUCCIN_LATTE];

/// The themes whose name (or "dark"/"light") matches `query`, in order.
/// See `search::matches`: "cmo" finds Catppuccin Mocha, and "rose" finds Rosé Pine.
pub fn search(query: &str) -> Vec<&'static Theme> {
    THEMES.iter().copied().filter(|theme| crate::search::matches(query, &format!("{} {}", theme.name, theme.appearance()))).collect()
}

#[cfg(test)]
mod tests {
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
}
