//! The colour themes, and the search behind the theme picker. `picker` is the picker's state.
//!
//! Each theme maps its palette onto the same roles. Rosé Pine: https://rosepinetheme.com/palette/ingredients
//! Catppuccin: https://catppuccin.com/palette

use wordle_gpui::rules::feedback::Mark;

pub mod picker;

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

pub static ROSE_PINE: Theme = Theme {
    name: "Rosé Pine",
    dark: true,
    background: 0x191724,
    surface: 0x1f1d2e,
    overlay: 0x26233a,
    highlight_low: 0x21202e,
    highlight_med: 0x403d52,
    highlight_high: 0x524f67,
    text: 0xe0def4,
    subtle: 0x908caa,
    muted: 0x6e6a86,
    correct: (0x31748f, 0xe0def4), // pine
    present: (0xf6c177, 0x191724), // gold
    absent: (0x26233a, 0x6e6a86),
    absent_key: (0x21202e, 0x6e6a86),
    heading: 0xebbcba, // rose
    error: 0xeb6f92,   // love
    success: 0x9ccfd8, // foam
    accent: 0xc4a7e7,  // iris
};

pub static ROSE_PINE_DAWN: Theme = Theme {
    name: "Rosé Pine Dawn",
    dark: false,
    background: 0xfaf4ed,
    surface: 0xfffaf3,
    overlay: 0xf2e9e1,
    highlight_low: 0xf4ede8,
    highlight_med: 0xdfdad9,
    highlight_high: 0xcecacd,
    text: 0x575279,
    subtle: 0x797593,
    muted: 0x9893a5,
    correct: (0x286983, 0xfaf4ed),
    present: (0xea9d34, 0xfaf4ed),
    absent: (0x9893a5, 0xfaf4ed),
    absent_key: (0x9893a5, 0xfaf4ed),
    heading: 0xd7827e,
    error: 0xb4637a,
    success: 0x56949f,
    accent: 0x907aa9,
};

pub static CATPPUCCIN_MOCHA: Theme = Theme {
    name: "Catppuccin Mocha",
    dark: true,
    background: 0x1e1e2e,     // base
    surface: 0x181825,        // mantle
    overlay: 0x313244,        // surface0
    highlight_low: 0x181825,  // mantle
    highlight_med: 0x45475a,  // surface1
    highlight_high: 0x585b70, // surface2
    text: 0xcdd6f4,
    subtle: 0xa6adc8, // subtext0
    muted: 0x6c7086,  // overlay0
    correct: (0xa6e3a1, 0x1e1e2e), // green
    present: (0xf9e2af, 0x1e1e2e), // yellow
    absent: (0x313244, 0x7f849c),
    absent_key: (0x181825, 0x6c7086),
    heading: 0xcba6f7, // mauve
    error: 0xf38ba8,   // red
    success: 0x94e2d5, // teal
    accent: 0xb4befe,  // lavender
};

pub static CATPPUCCIN_LATTE: Theme = Theme {
    name: "Catppuccin Latte",
    dark: false,
    background: 0xeff1f5,
    surface: 0xe6e9ef,
    overlay: 0xccd0da,
    highlight_low: 0xdce0e8,
    highlight_med: 0xbcc0cc,
    highlight_high: 0xacb0be,
    text: 0x4c4f69,
    subtle: 0x6c6f85,
    muted: 0x9ca0b0,
    correct: (0x40a02b, 0xeff1f5),
    present: (0xdf8e1d, 0xeff1f5),
    absent: (0x8c8fa1, 0xeff1f5),
    absent_key: (0x8c8fa1, 0xeff1f5),
    heading: 0x8839ef,
    error: 0xd20f39,
    success: 0x179299,
    accent: 0x7287fd,
};

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
