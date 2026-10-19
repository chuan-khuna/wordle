//! Flexoki, dark: https://stephango.com/flexoki

use super::Theme;

pub static FLEXOKI_DARK: Theme = Theme {
    name: "Flexoki Dark",
    dark: true,
    background: 0x100f0f,    // black
    surface: 0x1c1b1a,       // 950
    overlay: 0x282726,       // 900
    highlight_low: 0x282726, // 900
    highlight_med: 0x403e3c, // 800
    highlight_high: 0x575653, // 700
    text: 0xcecdc3,   // 200
    subtle: 0x878580, // 500
    muted: 0x6f6e69,  // 600
    correct: (0x879a39, 0x100f0f), // green 400
    present: (0xd0a215, 0x100f0f), // yellow 400
    absent: (0x282726, 0x6f6e69),
    absent_key: (0x1c1b1a, 0x6f6e69),
    heading: 0xda702c, // orange 400
    error: 0xd14d41,   // red 400
    success: 0x879a39, // green 400
    accent: 0x3aa99f,  // cyan 400
};
