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

# Precompute the Guess Count Matrix of each Strategy (asks how many threads and which). Takes --threads N, --strategy ID (repeatable), --opener WORD (repeatable), --out DIR
precompute-guess-counts *args:
    uv run src/precompute_guess_counts.py {{args}}

# Run the website backend's tests
[working-directory: 'app/backend']
test-backend:
    uv run pytest

# Precompute the website backend's Feedback matrices, Benchmark and Openers. Takes --threads N, --out DIR, --yes, --skip-benchmark, --benchmark-only
[working-directory: 'app/backend']
backend-precompute *args:
    uv run -m wordle_backend.precompute {{args}}

# Serve the website backend (FastAPI) on http://127.0.0.1:8000. Takes uvicorn options, e.g. --port 8001
[working-directory: 'app/backend']
backend *args:
    uv run uvicorn wordle_backend.main:app {{args}}

# Run the website frontend (Next.js) dev server on http://localhost:3000. Proxies /api to BACKEND_URL (default http://127.0.0.1:8000). Takes next dev options, e.g. --port 3001
[working-directory: 'app/frontend']
frontend *args:
    bun run dev {{args}}

# Run the website: backend on :8000 and frontend on :3000 together. Ctrl-C stops both
[working-directory: 'app']
[unix]
web:
    #!/usr/bin/env bash
    set -u
    trap 'trap - INT TERM EXIT; kill 0' INT TERM EXIT
    (cd backend && exec uv run uvicorn wordle_backend.main:app) &
    (cd frontend && exec bun run dev) &
    wait
