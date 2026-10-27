set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]
# Recipes run from the repo root, as in the root justfile
set working-directory := '..'

# Present the YouTube video's slides (Slidev) on http://localhost:3030; press P for the presenter view with the script. Takes slidev options, e.g. --port 3031
[default]
[working-directory: 'app/slidev']
present *args:
    bun run dev {{args}}

# Build the slides as a static site into app/slidev/dist/
[working-directory: 'app/slidev']
build:
    bun run build
