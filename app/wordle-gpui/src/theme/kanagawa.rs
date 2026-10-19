//! Kanagawa Wave, dark: https://github.com/rebelot/kanagawa.nvim

use super::Theme;

pub static KANAGAWA: Theme = Theme {
    name: "Kanagawa",
    dark: true,
    background: 0x16161d,     // sumiInk0
    surface: 0x1f1f28,        // sumiInk3
    overlay: 0x2a2a37,        // sumiInk4
    highlight_low: 0x1a1a22,  // sumiInk2
    highlight_med: 0x363646,  // sumiInk5
    highlight_high: 0x54546d, // sumiInk6
    text: 0xdcd7ba,   // fujiWhite
    subtle: 0xc8c093, // oldWhite
    muted: 0x727169,  // fujiGray
    correct: (0x98bb6c, 0x16161d), // springGreen
    present: (0xe6c384, 0x16161d), // carpYellow
    absent: (0x2a2a37, 0x727169),
    absent_key: (0x1a1a22, 0x727169),
    heading: 0xffa066, // surimiOrange
    error: 0xe46876,   // waveRed
    success: 0x7aa89f, // waveAqua2
    accent: 0x957fb8,  // oniViolet
};
