# Feedback scoring

How `feedback(guess, answer)` in `packages/wordle/src/wordle/engine/feedback.py` decides each letter's Mark.

## The rule

Each letter of the Answer can "pay for" only one Mark. So when a letter is repeated, only as many copies get a Correct or Present Mark as the Answer has; the rest are Absent. Correct Marks are given out before Present ones.

## The two passes

1. **Correct:** compare the Guess and Answer position by position. Matching letters are Correct; everything else starts as Absent.
2. **Present:** count the Answer letters that pass 1 didn't use (a `Counter`). Then, left to right, each non-Correct letter of the Guess becomes Present if the count for that letter is above zero, and the count goes down by one.

## Worked examples

| Guess | Answer | Feedback | Why |
| --- | --- | --- | --- |
| SPEED | ABIDE | ⬛⬛🟨⬛🟨 | ABIDE has one E: the first E takes it, the second is Absent |
| LLLLL | HELLO | ⬛⬛🟩🟩⬛ | Both Ls of HELLO are used by the Correct Ls, none left for the others |
| EERIE | CRANE | ⬛⬛🟨⬛🟩 | CRANE's only E goes to the Correct E at the end, so the two earlier Es are Absent; R is Present |
| BBAAA | AABBB | 🟨🟨🟨🟨⬛ | Two As in the Answer, so only two As in the Guess are Present |

The same cases are in `packages/wordle/tests/test_feedback.py`.

## Where it came from

The algorithm is the `get_score` method of `utils/wordle.py` in [chuan-khuna/wordle-but-statistics](https://github.com/chuan-khuna/wordle-but-statistics), rewritten without numpy or pandas. Before porting it, it was checked against an independent implementation on 90,000 random word pairs and every pair of five-letter strings made of `a` and `b`, with no differences. The rest of that file (the game loop) had bugs and was rewritten; see [game-and-state.md](game-and-state.md).
