//! The state and keys behind what floats above the board (the command palette, the settings
//! menu's seed field, the theme picker, the thread picker and the guess counts picker), testable without a window.
//! `ui/` draws them.

pub mod commands;
pub mod guess_counts;
pub mod precompute;
pub mod search;
pub mod theme_picker;
