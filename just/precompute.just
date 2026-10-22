set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]
# Every recipe gets the variables in .env (see .env.example)
set dotenv-load
# Recipes run from the repo root, as in the root justfile
set working-directory := '..'

# Precompute the Feedback matrices (asks for the thread count). Takes --threads N, --out DIR, --yes
feedback *args:
    uv run src/precompute.py {{args}}

# Precompute the Guess Count Matrix of each Strategy (asks how many threads and which). Takes --threads N, --strategy ID (repeatable), --opener WORD (repeatable), --out DIR
guess-counts *args:
    uv run src/precompute_guess_counts.py {{args}}

# Precompute the website's Benchmark and Opener leaderboard (asks for the thread count). Takes --threads N, --out DIR, --yes
benchmark *args:
    uv run src/precompute_benchmark.py {{args}}

# Turn a version 1 Guess Count Matrix folder (flat <id>.npy files) into version 2 without playing again. Takes --out DIR, --yes
migrate *args:
    uv run src/migrate_guess_counts.py {{args}}
