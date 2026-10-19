//! Catppuccin Latte, light: https://catppuccin.com/palette

use super::Theme;

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
