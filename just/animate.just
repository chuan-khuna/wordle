set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]
# Every recipe gets the variables in .env (see .env.example)
set dotenv-load
# Recipes run from the repo root, as in the root justfile
set working-directory := '..'

# Check an animation in src/animations/ (e.g. what_is_wordle): timeline, storyboard and layout problems. Takes manimgx inspect options, e.g. -t 1.5,end
inspect name *args:
    mkdir -p build/animations/{{name}}
    uv run manimgx inspect src/animations/{{name}}.py -o build/animations/{{name}}/{{name}}.storyboard.png {{args}}

# Present an animation in src/animations/ (e.g. what_is_wordle) as slides in the browser: writes build/animations/<name>/. Takes manimgx present options, e.g. --pdf, -r 1280x720
present name *args:
    mkdir -p build/animations/{{name}}
    uv run manimgx present src/animations/{{name}}.py -o build/animations/{{name}}/{{name}}.mp4 {{args}}
