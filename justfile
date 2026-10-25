set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]
# Every recipe gets the variables in .env (see .env.example)
set dotenv-load

# Precompute the Solver's files into precompute-cache/
mod precompute 'just/precompute.just'
# Back up precompute-cache/ into data/precompute/ and restore it
mod cache 'just/cache.just'
# Run the tests
mod test 'just/test.just'
# Run the website
mod web 'just/web.just'
# Present the YouTube video's slides (Slidev) in app/slidev/
mod slides 'just/slides.just'
# Check and present the animations in src/animations/
mod animate 'just/animate.just'

# List the recipes
default:
    @just --list --list-submodules

# Play Wordle in the terminal (Python). Takes --answer WORD, --seed N, --unlimited
wordle *args:
    uv run src/main.py {{args}}

# Play Wordle in a window (Rust + gpui). Takes --answer WORD, --seed N, --unlimited
[working-directory: 'app/wordle-gpui']
wordle-gpui *args:
    cargo run --release -- {{args}}
