//! Rosé Pine, dark: https://rosepinetheme.com/palette/ingredients

use super::Theme;

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
