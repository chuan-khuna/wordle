set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]
# Every recipe gets the variables in .env (see .env.example)
set dotenv-load
# Recipes run from the repo root, as in the root justfile
set working-directory := '..'

# Compress precompute-cache/ (all but the Feedback matrices) into data/precompute/ to commit. Takes --folder NAME, --yes, --partial
backup *args:
    uv run src/precompute_backup.py backup {{args}}

# Decompress data/precompute/ back into precompute-cache/. Takes --folder NAME, --yes
restore *args:
    uv run src/precompute_backup.py restore {{args}}
