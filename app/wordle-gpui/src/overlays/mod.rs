//! The state and keys behind what floats above the board (the command palette, the settings
//! menu's seed field, the theme picker, the thread picker and the guess counts picker), and of the
//! precompute view that takes the board's place during a run, testable without a window.
//! `ui/` draws them.

pub mod commands;
pub mod guess_counts;
pub mod precompute;
pub mod precompute_run;
pub mod search;
pub mod theme_picker;
