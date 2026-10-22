"""Wordle Tiles for ManimGX scenes: a Tile, a row and a board of them, and the
animations Wordle plays on them (typing a letter, flipping a row to show its Feedback).
Coloured with the Rosé Pine theme."""

import manimgx as m
from wordle.engine.feedback import Mark

from common.rosepine import BASE, HIGHLIGHT_HIGH, HIGHLIGHT_MED, MARK_FILL, MARK_INK, MONO, SANS, TEXT

TILE = 0.9  # a Tile's side, in scene units
GAP = 0.12  # the space between two Tiles


def words(text: str, size: float = 34, color=TEXT, **options) -> m.Text:
    return m.Text(text, font=SANS, font_size=size, color=color, **options)


def tile(letter: str = "", size: float = TILE) -> m.VGroup:
    """An empty Tile (only an outline), with its letter if it has one: [square, letter]."""
    square = m.RoundedRectangle(
        width=size, height=size, corner_radius=size * 0.08,
        stroke_color=HIGHLIGHT_MED, stroke_width=3, fill_color=BASE, fill_opacity=1,
    )
    glyph = m.Text(letter.upper() or " ", font=MONO, weight=m.BOLD,
                   font_size=size * 52, color=TEXT).move_to(square)
    if not letter:
        glyph.set_opacity(0)
    return m.VGroup(square, glyph)


def row(word: str = "", size: float = TILE) -> m.VGroup:
    """Five Tiles side by side, holding `word` (or empty)."""
    letters = word.ljust(5)
    return m.VGroup(*(tile(c.strip(), size) for c in letters)).arrange(m.RIGHT, buff=GAP * size / TILE)


def board(rows: int = 6, size: float = TILE) -> m.VGroup:
    return m.VGroup(*(row(size=size) for _ in range(rows))).arrange(m.DOWN, buff=GAP * size / TILE)


def paint(t: m.VGroup, mark: Mark) -> m.VGroup:
    """Give a Tile its Mark's colours, straight away."""
    t[0].set_fill(MARK_FILL[mark], opacity=1).set_stroke(MARK_FILL[mark])
    t[1].set_color(MARK_INK[mark])
    return t


def reveal(r: m.VGroup, marks) -> m.LaggedStart:
    """Flip a row's Tiles left to right."""
    return m.LaggedStart(*(flip(t, mark) for t, mark in zip(r, marks)), lag_ratio=0.35)


def flip(t: m.VGroup, mark: Mark) -> m.Succession:
    """Turn a Tile over, as Wordle does, to show its Mark on the other side."""
    height = t.height
    return m.Succession(
        t.animate(run_time=0.2).stretch_to_fit_height(0.02),
        t.animate(run_time=0.2).become(paint(t.copy(), mark).stretch_to_fit_height(height)),
    )


def type_in(r: m.VGroup, word: str) -> m.LaggedStart:
    """Put `word`'s letters into an empty row, one key at a time."""
    animations = []
    for t, letter in zip(r, word):
        filled = tile(letter, t.width).move_to(t)
        filled[0].set_stroke(HIGHLIGHT_HIGH)
        animations.append(m.Succession(
            t.animate(run_time=0.06).become(filled).scale(1.12),
            t.animate(run_time=0.08).scale(1 / 1.12),
        ))
    return m.LaggedStart(*animations, lag_ratio=0.6)
