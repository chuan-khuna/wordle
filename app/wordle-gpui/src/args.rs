//! The command-line options: `--answer WORD`, `--seed N`, `--unlimited`.

use wordle_gpui::engine::game::{Game, MAX_GUESSES, MAX_SEED, random_seed};

/// How the player started the app.
pub struct Args {
    answer: Option<String>,
    seed: Option<u32>,
    unlimited: bool,
}

impl Args {
    pub fn parse() -> Result<Self, String> {
        let mut args = Args { answer: None, seed: None, unlimited: false };
        let mut rest = std::env::args().skip(1);
        while let Some(arg) = rest.next() {
            match arg.as_str() {
                "--answer" => args.answer = Some(rest.next().ok_or("--answer needs a word")?),
                "--seed" => {
                    let seed = rest.next().and_then(|s| s.parse().ok()).filter(|s| *s <= MAX_SEED);
                    args.seed = Some(seed.ok_or(format!("--seed needs a whole number from 0 to {MAX_SEED}"))?);
                }
                "--unlimited" => args.unlimited = true,
                "-h" | "--help" => {
                    println!("Play Wordle in a window.\n\nOptions:\n  --answer WORD  play with this Answer instead of a random one\n  --seed N       replay the Answer picked by this seed (the same as the terminal game's)\n  --unlimited    no Guess Limit: keep guessing until you win");
                    std::process::exit(0);
                }
                other => return Err(format!("unknown argument {other:?} (try --help)")),
            }
        }
        Ok(args)
    }

    fn max_guesses(&self) -> Option<usize> {
        if self.unlimited { None } else { Some(MAX_GUESSES) }
    }

    pub fn first_game(&self) -> Result<Game, String> {
        match (&self.answer, self.seed) {
            (Some(answer), _) => Game::new(answer, self.max_guesses()).map_err(|e| e.to_string()),
            (None, Some(seed)) => Ok(Game::random(seed, self.max_guesses())),
            (None, None) => Ok(Game::random(random_seed(), self.max_guesses())),
        }
    }
}
