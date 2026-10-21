import { describe, expect, test } from "bun:test";
import { fitsPattern, guessList } from "./words";

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
