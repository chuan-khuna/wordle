//! Nord, dark: https://www.nordtheme.com/docs/colors-and-palettes

use super::Theme;

pub static NORD: Theme = Theme {
    name: "Nord",
    dark: true,
    background: 0x242933,     // darker than nord0, so the panels read as islands
    surface: 0x2e3440,        // nord0
    overlay: 0x3b4252,        // nord1
    highlight_low: 0x3b4252,  // nord1
    highlight_med: 0x434c5e,  // nord2
    highlight_high: 0x4c566a, // nord3
    text: 0xd8dee9,   // nord4
    subtle: 0x9aa5b8, // between nord3 and nord4
    muted: 0x616e88,  // nord3, brightened
    correct: (0xa3be8c, 0x2e3440), // nord14, green
    present: (0xebcb8b, 0x2e3440), // nord13, yellow
    absent: (0x3b4252, 0x616e88),
    absent_key: (0x2e3440, 0x616e88),
    heading: 0xd08770, // nord12, orange
    error: 0xbf616a,   // nord11, red
    success: 0x8fbcbb, // nord7
    accent: 0x88c0d0,  // nord8
};
