set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

# List the recipes
default:
    @just --list

# Play Wordle in the terminal (Python). Takes --answer WORD, --seed N, --unlimited
wordle *args:
    uv run src/main.py {{args}}

# Play Wordle in a window (Rust + gpui). Takes --answer WORD, --seed N, --unlimited
[working-directory: 'app/wordle-gpui']
wordle-gpui *args:
    cargo run --release -- {{args}}

# Run the Python tests
test:
    uv run pytest

# Run the gpui app's tests
[working-directory: 'app/wordle-gpui']
test-gpui:
    cargo test

# Precompute the Feedback matrices (asks for the thread count). Takes --threads N, --out DIR, --yes
precompute *args:
    uv run src/precompute.py {{args}}

# Run the website backend's tests
[working-directory: 'app/backend']
test-backend:
    uv run pytest
