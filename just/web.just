set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]
# Every recipe gets the variables in .env (see .env.example)
set dotenv-load
# Recipes run from the repo root, as in the root justfile
set working-directory := '..'

# Run the website: backend on :8000 and frontend on :3000 together, output prefixed api/web (the scripts in app/package.json). Ctrl-C stops both
[default]
[working-directory: 'app']
both:
    bun run --parallel api web

# Serve the website backend (FastAPI) on http://127.0.0.1:8000. Takes uvicorn options, e.g. --port 8001
[working-directory: 'app/backend']
backend *args:
    uv run uvicorn wordle_backend.main:app {{args}}

# Run the website frontend (Next.js) dev server on http://localhost:3000. Proxies /api to BACKEND_URL (default http://127.0.0.1:8000). Takes next dev options, e.g. --port 3001
[working-directory: 'app/frontend']
frontend *args:
    bun run dev {{args}}
