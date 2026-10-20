//! The colour themes, and the search behind the theme picker. `picker` is the picker's state.
//!
//! Each theme is in its own file and maps its palette onto the same roles. To add one, add a file
//! and list it in `THEMES`.

use wordle_gpui::engine::feedback::Mark;

mod catppuccin_latte;
mod catppuccin_mocha;
mod everforest;
mod flexoki_dark;
mod flexoki_light;
mod kanagawa;
mod nord;
mod rose_pine;
mod rose_pine_dawn;
mod tokyo_night;

pub use catppuccin_latte::CATPPUCCIN_LATTE;
pub use catppuccin_mocha::CATPPUCCIN_MOCHA;
pub use flexoki_dark::FLEXOKI_DARK;
pub use everforest::EVERFOREST;
pub use flexoki_light::FLEXOKI_LIGHT;
pub use kanagawa::KANAGAWA;
pub use nord::NORD;
pub use tokyo_night::TOKYO_NIGHT;
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

/// Every theme, dark ones first and then light ones: the picker lists them in this order, under a heading for each.
pub static THEMES: [&Theme; 10] = [
    &ROSE_PINE,
    &CATPPUCCIN_MOCHA,
    &FLEXOKI_DARK,
    &TOKYO_NIGHT,
    &EVERFOREST,
    &KANAGAWA,
    &NORD,
    &ROSE_PINE_DAWN,
    &CATPPUCCIN_LATTE,
    &FLEXOKI_LIGHT,
];

/// The themes whose name (or "dark"/"light") matches `query`, in order.
/// See `search::matches`: "cmo" finds Catppuccin Mocha, and "rose" finds Rosé Pine.
pub fn search(query: &str) -> Vec<&'static Theme> {
    THEMES.iter().copied().filter(|theme| crate::overlays::search::matches(query, &format!("{} {}", theme.name, theme.appearance()))).collect()
}

#[cfg(test)]
#[path = "theme_tests.rs"]
mod tests;
