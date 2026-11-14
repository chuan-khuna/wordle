import { describe, expect, test } from "bun:test";
import { answerList, fitsPattern, guessList } from "./words";

describe("fitsPattern", () => {
  const words = ["batch", "hatch", "crane"];

  test("a blank stands for any letter", () => {
    expect(fitsPattern("_atch", words)).toBe(true);
    expect(fitsPattern("cr_n_", words)).toBe(true);
  });

  test("a word with no blanks must be one of the words", () => {
    expect(fitsPattern("batch", words)).toBe(true);
    expect(fitsPattern("watch", words)).toBe(false);
  });

  test("a typo fits nothing", () => {
    expect(fitsPattern("_acth", words)).toBe(false);
  });

  test("the length must match", () => {
    expect(fitsPattern("_atc", words)).toBe(false);
  });

  test("the Guess List has words for the Articles' patterns", () => {
    expect(fitsPattern("_atch", guessList())).toBe(true);
  });
});

describe("answerList", () => {
  // The Feedback Matrix page draws the backend's matrix with these words as its axes, so their order must be the
  // matrix's: Python's sorted() of the same file (app/backend/tests/test_feedback_matrix.py checks that side).
  test("is the 2,315 Answers, lowercase ASCII, strictly ascending", () => {
    const words = answerList();
    expect(words.length).toBe(2315);
    expect(words.every((w) => /^[a-z]{5}$/.test(w))).toBe(true);
    expect(words.every((w, i) => i === 0 || words[i - 1] < w)).toBe(true);
    expect(words[0]).toBe("aback");
  });
});
