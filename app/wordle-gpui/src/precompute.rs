//! The "Precompute matrices…" picker's state, testable without a window: choose how many threads
//! score the Feedback matrices (1, 2, 4 or 8). Up and Down move, Enter runs, Escape goes back.
//! Typing 1, 2, 4 or 8 jumps to that count.

use wordle_gpui::rules::matrix::THREAD_CHOICES;

pub struct ThreadPicker {
    /// Which of `THREAD_CHOICES` is highlighted.
    pub selected: usize,
}

/// What a key press in the picker asks the app to do.
#[derive(Debug, PartialEq)]
pub enum Outcome {
    /// Close the picker and precompute the matrices on this many threads.
    Run(usize),
    Cancel,
    /// Nothing to change, apart from the picker itself.
    None,
}

impl Default for ThreadPicker {
    /// Starts on the largest choice that the machine has cores for (at least one thread).
    fn default() -> Self {
        let cores = std::thread::available_parallelism().map_or(1, |n| n.get());
        let selected = THREAD_CHOICES.iter().rposition(|&threads| threads <= cores).unwrap_or(0);
        Self { selected }
    }
}

impl ThreadPicker {
    pub fn threads(&self) -> usize {
        THREAD_CHOICES[self.selected]
    }

    /// `key` is gpui's name for the key ("up", "enter", "4").
    pub fn press(&mut self, key: &str) -> Outcome {
        let count = THREAD_CHOICES.len();
        match key {
            "escape" => Outcome::Cancel,
            "enter" => Outcome::Run(self.threads()),
            "down" => {
                self.selected = (self.selected + 1) % count;
                Outcome::None
            }
            "up" => {
                self.selected = (self.selected + count - 1) % count;
                Outcome::None
            }
            _ => {
                if let Some(index) = key.parse::<usize>().ok().and_then(|threads| THREAD_CHOICES.iter().position(|&choice| choice == threads)) {
                    self.selected = index;
                }
                Outcome::None
            }
        }
    }
}

/// "4 threads" or "1 thread".
pub fn threads_label(threads: usize) -> String {
    format!("{threads} thread{}", if threads == 1 { "" } else { "s" })
}

#[cfg(test)]
#[path = "precompute_tests.rs"]
mod tests;
