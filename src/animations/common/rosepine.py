"""The Rosé Pine palette for ManimGX scenes, with the same Mark colours as the website's
and the gpui app's Rosé Pine theme (app/frontend/src/app/themes.css).

Import it before making a scene: it sets the background, and every scene in src/animations/ takes its
colours from these names rather than from Manim's own (m.BLUE, m.YELLOW, ...).
"""

import manimgx as m
from wordle.engine.feedback import Mark

# The palette: https://rosepinetheme.com/palette
BASE = m.ManimColor("#191724")
SURFACE = m.ManimColor("#1f1d2e")
OVERLAY = m.ManimColor("#26233a")
MUTED = m.ManimColor("#6e6a86")
SUBTLE = m.ManimColor("#908caa")
TEXT = m.ManimColor("#e0def4")
LOVE = m.ManimColor("#eb6f92")
GOLD = m.ManimColor("#f6c177")
ROSE = m.ManimColor("#ebbcba")
PINE = m.ManimColor("#31748f")
FOAM = m.ManimColor("#9ccfd8")
IRIS = m.ManimColor("#c4a7e7")
HIGHLIGHT_LOW = m.ManimColor("#21202e")
HIGHLIGHT_MED = m.ManimColor("#403d52")
HIGHLIGHT_HIGH = m.ManimColor("#524f67")

# The roles the website names: headings, accents, and each Mark's fill and letter colour.
HEADING = ROSE
ACCENT = IRIS
MARK_FILL = {Mark.CORRECT: PINE, Mark.PRESENT: GOLD, Mark.ABSENT: OVERLAY}
MARK_INK = {Mark.CORRECT: TEXT, Mark.PRESENT: BASE, Mark.ABSENT: MUTED}

# The fonts ManimGX ships: Noto Sans for words, DejaVu Sans Mono for letters on tiles.
SANS = "Noto Sans"
MONO = "DejaVu Sans Mono"

m.config.background_color = BASE
