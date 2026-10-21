import { expect, test } from "bun:test";
import { HOLD_BEATS, MAX_BOARDS, beatsFor, nextStrategy, parseAnswers, parseBoards, revealed } from "@/lib/side-by-side";

test("parseAnswers keeps five-letter words once, else the fallback", () => {
  expect(parseAnswers("Watch, goner watch zz", ["crane"])).toEqual(["watch", "goner"]);
  expect(parseAnswers(" , abc", ["crane"])).toEqual(["crane"]);
});

test("parseBoards keeps known ids once, at most four, else the fallback", () => {
  const fallback = ["bits-guesses-all", "bits-answers-candidates"];
  expect(parseBoards("bits-guesses-all,nope,bits-guesses-all,expected-guesses-all", fallback)).toEqual(["bits-guesses-all", "expected-guesses-all"]);
  expect(parseBoards("bits-guesses-all", fallback)).toEqual(fallback);
  const five = "bits-answers-candidates,bits-answers-all,bits-guesses-candidates,bits-guesses-all,expected-guesses-all";
  expect(parseBoards(five, fallback)).toHaveLength(MAX_BOARDS);
});

test("nextStrategy gives the first Strategy not on a board", () => {
  expect(nextStrategy(["bits-answers-candidates", "bits-guesses-all"])).toBe("bits-answers-all");
});

test("a board reveals one Guess per beat up to its Game, and an Answer lasts its longest Game plus the hold", () => {
  expect([0, 1, 4, 9].map((b) => revealed(b, 4))).toEqual([0, 1, 4, 4]);
  expect(beatsFor(8)).toBe(8 + HOLD_BEATS);
});
