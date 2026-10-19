//! Rosé Pine (the main variant): https://rosepinetheme.com/palette/ingredients

use wordle_gpui::feedback::Mark;

pub const BASE: u32 = 0x191724;
pub const SURFACE: u32 = 0x1f1d2e;
pub const OVERLAY: u32 = 0x26233a;
pub const MUTED: u32 = 0x6e6a86;
pub const SUBTLE: u32 = 0x908caa;
pub const TEXT: u32 = 0xe0def4;
pub const LOVE: u32 = 0xeb6f92;
pub const GOLD: u32 = 0xf6c177;
pub const ROSE: u32 = 0xebbcba;
pub const PINE: u32 = 0x31748f;
pub const FOAM: u32 = 0x9ccfd8;
pub const HIGHLIGHT_LOW: u32 = 0x21202e;
pub const HIGHLIGHT_MED: u32 = 0x403d52;
pub const HIGHLIGHT_HIGH: u32 = 0x524f67;

/// A tile or key's fill and letter colour for a Mark. Pine stands in for Wordle's green, Gold for its yellow.
pub fn mark_colours(mark: Mark) -> (u32, u32) {
    match mark {
        Mark::Correct => (PINE, TEXT),
        Mark::Present => (GOLD, BASE),
        Mark::Absent => (OVERLAY, MUTED),
    }
}
