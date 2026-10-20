//! The Solver, the same as the Python package's `wordle.solver`: the precomputed Feedback matrices
//! and the Strategy that picks Suggestions from them, and Solver mode's State entered by hand.

pub mod assist;
pub mod matrix;
pub mod strategy;
