//! The state and keys behind what floats above the board (the command palette, the settings
//! menu's seed field, the theme picker and the thread picker), testable without a window.
//! `ui/` draws them.

pub mod commands;
pub mod precompute;
pub mod search;
pub mod theme_picker;
