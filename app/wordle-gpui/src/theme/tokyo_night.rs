//! Tokyo Night, dark: https://github.com/folke/tokyonight.nvim

use super::Theme;

pub static TOKYO_NIGHT: Theme = Theme {
    name: "Tokyo Night",
    dark: true,
    background: 0x16161e,     // bg_dark
    surface: 0x1a1b26,        // bg
    overlay: 0x292e42,        // bg_highlight
    highlight_low: 0x1f2335,
    highlight_med: 0x3b4261,  // fg_gutter
    highlight_high: 0x545c7e, // dark3
    text: 0xc0caf5,   // fg
    subtle: 0xa9b1d6, // fg_dark
    muted: 0x565f89,  // comment
    correct: (0x9ece6a, 0x16161e), // green
    present: (0xe0af68, 0x16161e), // yellow
    absent: (0x292e42, 0x565f89),
    absent_key: (0x1f2335, 0x565f89),
    heading: 0xff9e64, // orange
    error: 0xf7768e,   // red
    success: 0x1abc9c, // teal
    accent: 0xbb9af7,  // purple
};
