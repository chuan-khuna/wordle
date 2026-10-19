//! Catppuccin Mocha, dark: https://catppuccin.com/palette

use super::Theme;

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
