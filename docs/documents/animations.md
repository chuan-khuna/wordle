# Animations

Explainer animations made with [ManimGX](https://manimgx.academa.ai/): Manim's Python API, rendered on the GPU. ManimGX is a dependency of the root workspace (`pyproject.toml`), so `uv sync` installs it.

## Layout

```
src/animations/
  common/              what every animation shares
    rosepine.py        the Rosé Pine palette, Mark colours, fonts; sets the background
    tiles.py           Tiles, rows and boards, and the type-in and flip animations
  what_is_wordle.py    one animation per file: src/animations/<name>.py
```

- An animation is one file, `src/animations/<name>.py`, defining one `m.Scene`. It imports what it shares from `common` (`from common.tiles import row, reveal`), which works because ManimGX puts the scene file's folder on the import path.
- `common/rosepine.py` holds the colours. It uses the same Mark colours as the website's and the gpui app's Rosé Pine theme (`app/frontend/src/app/themes.css`): Correct is pine, Present is gold, Absent is overlay. Importing it sets `m.config.background_color` to the Rosé Pine base. Scenes take every colour from it, never Manim's own (`m.BLUE`, …).
- `common/tiles.py` builds Tiles out of a rounded square and a DejaVu Sans Mono letter. `type_in` fills an empty row, and `reveal` flips a row's Tiles left to right to show their Marks.
- Feedback shown on Tiles comes from `wordle.engine.feedback`, so an animation can't disagree with the engine.

## Running

```sh
just animation-inspect what_is_wordle         # storyboard PNGs and layout problems, no video
just animation-inspect what_is_wordle -t 47   # the frame at 47 s
just animation-present what_is_wordle         # render and open as slides in the browser
just animation-present what_is_wordle --pdf   # also a PDF, one page per slide
```

Both recipes write to `build/animations/<name>/`, which is gitignored. `animation-present` writes `<name>.mp4` and `<name>.html`. The HTML page plays the video and stops at the end of each section. Keys: → or Space for the next slide, ← to go back, F for full screen, Shift+P for the presenter view (with each slide's notes). The page and the video must stay side by side.

Each `self.next_section("Title", notes="…")` begins a slide; `notes` show in the presenter view.

## What is Wordle? (`what_is_wordle.py`)

`WhatIsWordle` has eight slides, about 60 s in all:

1. **Title**: WORDLE typed in and flipped.
2. **The goal**: a hidden five-letter Answer, and six empty rows.
3. **A Guess**: CRANE typed in; a non-word is rejected.
4. **Feedback**: CRANE flipped against CABLE, then each Mark explained with the Tiles that got it.
5. **Repeated letters**: SPEED against ABIDE, where only one E is marked Present.
6. **A whole Game**: CRANE, CLOSE, CABLE, a Win in three, with a hint beside each row.
7. **Win or Loss**: the end of a Game, the daily Answer and the share grid.
8. **Your turn**: PLAY! flipped all Correct.

The example Game is the `ANSWER` and `GUESSES` constants at the top of the file.
