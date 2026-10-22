set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]
# Every recipe gets the variables in .env (see .env.example)
set dotenv-load
# Recipes run from the repo root, as in the root justfile
set working-directory := '..'

# Run the website: backend on :8000 and frontend on :3000 together. Ctrl-C stops both
[default]
[working-directory: 'app']
[unix]
both:
    #!/usr/bin/env bash
    set -u
    trap 'trap - INT TERM EXIT; kill 0' INT TERM EXIT
    (cd backend && exec uv run uvicorn wordle_backend.main:app) &
    (cd frontend && exec bun run dev) &
    wait

# Run the website: backend on :8000 and frontend on :3000 together. Ctrl-C stops both
[default]
[working-directory: 'app']
[windows]
[script("powershell.exe", "-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File")]
[extension: '.ps1']
both:
    $backend = Start-Process uv -ArgumentList 'run', 'uvicorn', 'wordle_backend.main:app' -WorkingDirectory backend -NoNewWindow -PassThru
    try {
        Set-Location frontend
        bun run dev
    } finally {
        # Ctrl-C reaches both through the shared console; this catches the backend if the frontend exits alone
        taskkill /T /F /PID $backend.Id 2>&1 | Out-Null
    }

# Serve the website backend (FastAPI) on http://127.0.0.1:8000. Takes uvicorn options, e.g. --port 8001
[working-directory: 'app/backend']
backend *args:
    uv run uvicorn wordle_backend.main:app {{args}}

# Run the website frontend (Next.js) dev server on http://localhost:3000. Proxies /api to BACKEND_URL (default http://127.0.0.1:8000). Takes next dev options, e.g. --port 3001
[working-directory: 'app/frontend']
frontend *args:
    bun run dev {{args}}
