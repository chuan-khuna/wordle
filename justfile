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

# Turn a version 1 Guess Count Matrix folder (flat <id>.npy files) into version 2 without playing again. Takes --out DIR, --yes
migrate-guess-counts *args:
    uv run src/migrate_guess_counts.py {{args}}

# Precompute the website's Benchmark and Opener leaderboard (asks for the thread count). Takes --threads N, --out DIR, --yes
precompute-benchmark *args:
    uv run src/precompute_benchmark.py {{args}}

# Compress precompute-cache/ (all but the Feedback matrices) into data/precompute/ to commit. Takes --folder NAME, --yes, --partial
backup-cache *args:
    uv run src/precompute_backup.py backup {{args}}

# Decompress data/precompute/ back into precompute-cache/. Takes --folder NAME, --yes
restore-cache *args:
    uv run src/precompute_backup.py restore {{args}}

# Run the website backend's tests
[working-directory: 'app/backend']
test-backend:
    uv run pytest

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

# Run the website: backend on :8000 and frontend on :3000 together. Ctrl-C stops both
[working-directory: 'app']
[windows]
[script("powershell.exe", "-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File")]
[extension: '.ps1']
web:
    $backend = Start-Process uv -ArgumentList 'run', 'uvicorn', 'wordle_backend.main:app' -WorkingDirectory backend -NoNewWindow -PassThru
    try {
        Set-Location frontend
        bun run dev
    } finally {
        # Ctrl-C reaches both through the shared console; this catches the backend if the frontend exits alone
        taskkill /T /F /PID $backend.Id 2>&1 | Out-Null
    }
