"""What is Wordle? A slide-by-slide animation of the rules, for `just animation-present what_is_wordle`.

Each `next_section` is a slide: `manimgx present` stops at its end until the presenter
goes on. The Feedback on every Tile comes from the game's own `feedback`, so the
animation can't disagree with the engine.
"""

import manimgx as m
from wordle.engine.feedback import Mark, feedback

from common.rosepine import ACCENT, HEADING, LOVE, MUTED, SUBTLE, TEXT
from common.tiles import board, paint, reveal, row, tile, type_in, words

ANSWER = "cable"
GUESSES = ["crane", "close", "cable"]  # the example Game, a Win in three


class WhatIsWordle(m.Scene):
    def construct(self) -> None:
        self.title_slide()
        self.goal_slide()
        self.guess_slide()
        self.marks_slide()
        self.repeated_letters_slide()
        self.game_slide()
        self.ending_slide()

    def clear(self) -> None:
        self.play(*(m.FadeOut(mob) for mob in self.mobjects), run_time=0.5)

    def heading(self, text: str) -> m.Text:
        title = words(text, size=44, color=HEADING, weight=m.BOLD).to_edge(m.UP, buff=0.6)
        self.play(m.FadeIn(title, shift=0.2 * m.DOWN), run_time=0.5)
        return title

    def title_slide(self) -> None:
        self.next_section("Title", notes="Wordle: a word game you play once a day.")
        name = row("wordl", size=1.1)
        name.add(tile("e", 1.1)).arrange(m.RIGHT, buff=0.13).shift(0.5 * m.UP)
        subtitle = words("a five-letter word puzzle, one a day", size=32, color=SUBTLE)
        subtitle.next_to(name, m.DOWN, buff=0.7)
        self.play(m.LaggedStart(*(m.FadeIn(t, scale=0.6) for t in name), lag_ratio=0.15))
        marks = [Mark.CORRECT, Mark.PRESENT, Mark.ABSENT, Mark.CORRECT, Mark.PRESENT, Mark.CORRECT]
        self.play(reveal(name, marks))
        self.play(m.FadeIn(subtitle, shift=0.2 * m.UP))
        self.wait()

    def goal_slide(self) -> None:
        self.next_section("The goal", notes="One hidden Answer, six Guesses to find it.")
        self.clear()
        title = self.heading("Find the hidden word")
        hidden = row("?????").next_to(title, m.DOWN, buff=1.0)
        for t in hidden:
            t[0].set_stroke(ACCENT)
            t[1].set_color(ACCENT)
        answer = words("the Answer: five letters, kept secret", size=28, color=SUBTLE)
        answer.next_to(hidden, m.DOWN, buff=0.4)
        self.play(m.LaggedStart(*(m.FadeIn(t, shift=0.3 * m.DOWN) for t in hidden), lag_ratio=0.1))
        self.play(m.FadeIn(answer))
        self.wait(0.5)

        grid = board(6, size=0.55).next_to(answer, m.DOWN, buff=0.5)
        limit = words("six Guesses to find it", size=28, color=TEXT).next_to(grid, m.RIGHT, buff=0.6)
        self.play(m.LaggedStart(*(m.FadeIn(r, shift=0.15 * m.UP) for r in grid), lag_ratio=0.15))
        self.play(m.FadeIn(limit, shift=0.2 * m.LEFT))
        self.wait()

    def guess_slide(self) -> None:
        self.next_section("A Guess", notes="Type any real five-letter word and press Enter.")
        self.clear()
        title = self.heading("Guess a real word")
        guess = row().next_to(title, m.DOWN, buff=1.2)
        self.play(m.FadeIn(guess))
        self.play(type_in(guess, GUESSES[0]))
        note = words("any word from the Guess List, then Enter", size=28, color=SUBTLE)
        note.next_to(guess, m.DOWN, buff=0.5)
        self.play(m.FadeIn(note))
        self.wait(0.5)

        nonsense = row().next_to(note, m.DOWN, buff=0.8)
        self.play(m.FadeIn(nonsense))
        self.play(type_in(nonsense, "xqzrt"))
        rejected = words("not a word: not accepted", size=26, color=LOVE).next_to(nonsense, m.DOWN, buff=0.3)
        self.play(m.Wiggle(nonsense), m.FadeIn(rejected))
        self.play(m.FadeOut(nonsense), m.FadeOut(rejected))
        self.wait()
        self.guess_row = guess
        self.guess_note = note

    def marks_slide(self) -> None:
        self.next_section("Feedback", notes="Each letter gets a Mark: Correct, Present or Absent.")
        guess, word = self.guess_row, GUESSES[0]
        marks = feedback(word, ANSWER)
        self.play(m.FadeOut(self.guess_note))
        self.play(reveal(guess, marks))
        self.wait(0.5)

        meanings = {
            Mark.CORRECT: "Correct: in the Answer, in this spot",
            Mark.PRESENT: "Present: in the Answer, in another spot",
            Mark.ABSENT: "Absent: not in the Answer",
        }
        legend = m.VGroup()
        for mark, text in meanings.items():
            sample = paint(tile(word[marks.index(mark)], 0.6), mark)
            legend.add(m.VGroup(sample, words(text, size=28)).arrange(m.RIGHT, buff=0.35))
        legend.arrange(m.DOWN, aligned_edge=m.LEFT, buff=0.3).next_to(guess, m.DOWN, buff=0.7)
        for entry in legend:
            mark = next(k for k, v in meanings.items() if v.startswith(entry[1].text.split(":")[0]))
            pointers = [guess[i] for i, k in enumerate(marks) if k == mark]
            self.play(m.FadeIn(entry, shift=0.2 * m.RIGHT),
                      *(m.Indicate(p, scale_factor=1.1, color=None) for p in pointers))
        self.wait()

    def repeated_letters_slide(self) -> None:
        self.next_section("Repeated letters",
                          notes="A letter is marked only as often as it is in the Answer.")
        self.clear()
        title = self.heading("A repeated letter")
        guess, answer = "speed", "abide"
        answer_row = row(answer)
        for t in answer_row:
            t[0].set_stroke(ACCENT)
        guess_row = row(guess)
        labels = m.VGroup(words("Answer", size=28, color=ACCENT), words("Guess", size=28, color=SUBTLE))
        pair = m.VGroup(answer_row, guess_row).arrange(m.DOWN, buff=0.5).next_to(title, m.DOWN, buff=0.9)
        for label, r in zip(labels, pair):
            label.next_to(r, m.LEFT, buff=0.5)
        self.play(m.FadeIn(answer_row), m.FadeIn(labels[0]))
        self.play(m.FadeIn(guess_row), m.FadeIn(labels[1]))
        self.play(reveal(guess_row, feedback(guess, answer)))
        note = words("ABIDE has one E, so only the first E is Present;\nthe second is Absent.",
                     size=28, color=TEXT).next_to(pair, m.DOWN, buff=0.7)
        self.play(m.Circumscribe(guess_row[2], color=HEADING), m.Circumscribe(guess_row[3], color=HEADING))
        self.play(m.FadeIn(note))
        self.wait()

    def game_slide(self) -> None:
        self.next_section("A whole Game", notes="Use every Mark to narrow down the next Guess.")
        self.clear()
        title = self.heading("Narrow it down")
        grid = board(6, size=0.75).next_to(title, m.DOWN, buff=0.5).to_edge(m.LEFT, buff=1.5)
        self.play(m.FadeIn(grid))
        hints = [
            "C and E are in place;\nA is in the word, elsewhere",
            "L is in the word too,\nbut not there",
            "five Correct Marks:\na Win in three!",
        ]
        hint = None
        for i, (word, text) in enumerate(zip(GUESSES, hints)):
            self.play(type_in(grid[i], word))
            self.play(reveal(grid[i], feedback(word, ANSWER)))
            new = words(text, size=26, color=SUBTLE if i < 2 else HEADING)
            new.next_to(grid, m.RIGHT, buff=0.6).align_to(grid[i], m.UP)
            self.play(m.FadeOut(hint) if hint else m.Wait(0), m.FadeIn(new, shift=0.2 * m.LEFT))
            hint = new
            self.wait(0.6)
        self.play(m.LaggedStart(*(m.Indicate(t, scale_factor=1.15, color=None) for t in grid[2]),
                                lag_ratio=0.15, run_time=1))
        self.wait()
        self.grid = grid

    def ending_slide(self) -> None:
        self.next_section("Win or Loss", notes="Six rows without a Win is a Loss; the Answer is shown.")
        self.clear()
        title = self.heading("Win or Loss")
        win = words("Find the Answer within six Guesses: a Win", size=30, color=TEXT)
        loss = words("Use all six without it: a Loss, and the Answer is shown", size=30, color=MUTED)
        daily = words("Everyone gets the same Answer each day: share your grid, not the word",
                      size=30, color=SUBTLE)
        lines = m.VGroup(win, loss, daily).arrange(m.DOWN, buff=0.45).next_to(title, m.DOWN, buff=0.8)
        for line in lines:
            self.play(m.FadeIn(line, shift=0.2 * m.UP))
        share = m.VGroup(*(
            m.VGroup(*(paint(tile(size=0.32), mark) for mark in feedback(word, ANSWER))).arrange(m.RIGHT, buff=0.05)
            for word in GUESSES
        )).arrange(m.DOWN, buff=0.05).next_to(lines, m.DOWN, buff=0.6)
        self.play(m.LaggedStart(*(m.FadeIn(r, shift=0.1 * m.UP) for r in share), lag_ratio=0.3))
        self.wait()

        self.next_section("Your turn", notes="Over to you.")
        self.clear()
        end = row("play!", size=1.0)
        self.play(m.LaggedStart(*(m.FadeIn(t, scale=0.6) for t in end), lag_ratio=0.12))
        self.play(reveal(end, [Mark.CORRECT] * 5))
        self.wait(2)
