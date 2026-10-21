import { expect, test } from "bun:test";
import type { SolveResponse, SplitResponse } from "@/lib/api";
import solveFixture from "@/lib/widgets/fixtures/solve-watch-crane.json";
import splitFixture from "@/lib/widgets/fixtures/split-moist-after-crane.json";
import { answerGroup, columnCount, headSize, orderSplitGroups, singleWordGroups, statesPerRow } from "@/lib/widgets/split-groups";

const group = (code: number, count: number, words: string[] = []) => ({ marks: String(code), code, count, words });

test("orderSplitGroups: biggest first, ties by lower Feedback Code", () => {
  const out = orderSplitGroups([group(9, 2), group(4, 5), group(3, 2), group(242, 1)]);
  expect(out.map((g) => g.code)).toEqual([4, 3, 9, 242]);
});

test("orderSplitGroups sorts each group's words alphabetically and leaves the input alone", () => {
  const input = [group(1, 3, ["crane", "abide", "bacon"])];
  expect(orderSplitGroups(input)[0].words).toEqual(["abide", "bacon", "crane"]);
  expect(input[0].words).toEqual(["crane", "abide", "bacon"]);
});

test("columnCount is about the square root of the word count", () => {
  expect(columnCount(1, 20)).toBe(1);
  expect(columnCount(2, 20)).toBe(2);
  expect(columnCount(9, 20)).toBe(3);
  expect(columnCount(10, 20)).toBe(4);
  expect(columnCount(16, 20)).toBe(4);
  expect(columnCount(168, 20)).toBe(13);
});

test("columnCount is never below 1 and never above the columns that fit", () => {
  expect(columnCount(0, 20)).toBe(1);
  expect(columnCount(100, 4)).toBe(4);
  expect(columnCount(100, 4.7)).toBe(4);
  expect(columnCount(100, 0)).toBe(1);
  expect(columnCount(100, 10)).toBe(10);
});

test("headSize shrinks with the group", () => {
  expect(headSize(300)).toBe("lg");
  expect(headSize(100)).toBe("lg");
  expect(headSize(99)).toBe("md");
  expect(headSize(25)).toBe("md");
  expect(headSize(24)).toBe("sm");
  expect(headSize(5)).toBe("sm");
  expect(headSize(4)).toBe("xs");
  expect(headSize(1)).toBe("xs");
});

test("singleWordGroups counts the groups of exactly one word", () => {
  expect(singleWordGroups([group(1, 5), group(2, 1), group(3, 1), group(4, 2)])).toBe(2);
  expect(singleWordGroups([group(1, 5)])).toBe(0);
  expect(singleWordGroups([])).toBe(0);
});

// Recorded from the running backend: `GET /api/solve?answer=watch&opener=crane`, and `POST /api/split` for row 2.
const solve = solveFixture as unknown as SolveResponse;
const row2 = splitFixture as unknown as SplitResponse;

test("statesPerRow: row k holds the Guesses before Guess k, with their Feedback", () => {
  const states = statesPerRow(solve);
  expect(states).toHaveLength(solve.guesses);
  expect(states[0]).toEqual([]);
  expect(states[1]).toEqual([{ guess: "crane", feedback: "10100" }]);
  expect(states[3]).toEqual([
    { guess: "crane", feedback: "10100" },
    { guess: "moist", feedback: "00001" },
    { guess: "blowy", feedback: "00010" },
  ]);
});

test("statesPerRow: a one-Guess Game has one empty State", () => {
  expect(statesPerRow({ steps: [solve.steps[0]] })).toEqual([[]]);
});

test("answerGroup finds the group holding the Answer, and its Feedback is the Guess's Feedback", () => {
  const group = answerGroup(row2, "watch");
  expect(group?.marks).toBe(solve.steps[1].marks);
  expect(group?.code).toBe(solve.steps[1].code);
  expect(group?.words).toContain("watch");
  expect(group?.count).toBe(solve.steps[1].candidates_after);
});

test("answerGroup is undefined when no group holds the word", () => {
  expect(answerGroup(row2, "zzzzz")).toBeUndefined();
});
