set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]
# Every recipe gets the variables in .env (see .env.example)
set dotenv-load
# Recipes run from the repo root, as in the root justfile
set working-directory := '..'

# Run every test suite: Python, gpui app, website backend
[default]
all: python gpui backend

# Run the Python tests
python:
    uv run pytest

# Run the gpui app's tests
[working-directory: 'app/wordle-gpui']
gpui:
    cargo test

# Run the website backend's tests
[working-directory: 'app/backend']
backend:
    uv run pytest
