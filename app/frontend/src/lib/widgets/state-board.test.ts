import { expect, test } from "bun:test";
import { type Board, backspace, canType, cycleMark, enterGuess, isWin, nextMark, rowsFromState, startOver, typeLetter } from "./state-board";
import { formatState, parseState } from "./widget-state";

const type = (b: Board, text: string) => [...text].reduce(typeLetter, b);
const add = (b: Board, word: string) => enterGuess(type(b, word));

test("typing takes letters only, lowercases, and stops at five", () => {
  let b = startOver();
  b = type(b, "Cr4a-ne!x");
  expect(b.typed).toBe("crane");
});

test("enter needs five letters and starts the row all Absent", () => {
  expect(enterGuess(type(startOver(), "cran")).rows).toHaveLength(0);
  const b = add(startOver(), "crane");
  expect(b.rows).toEqual([{ guess: "crane", marks: [0, 0, 0, 0, 0] }]);
  expect(b.typed).toBe("");
});

test("backspace removes a typed letter, then pulls the last Guess back to edit", () => {
  let b = add(add(startOver(), "crane"), "slate");
  b = type(b, "ab");
  b = backspace(b);
  expect(b.typed).toBe("a");
  b = backspace(b);
  expect(b.typed).toBe("");
  expect(b.rows).toHaveLength(2);
  b = backspace(b);
  expect(b.rows.map((r) => r.guess)).toEqual(["crane"]);
  expect(b.typed).toBe("slate");
  expect(backspace(backspace(startOver()))).toEqual(startOver());
});

test("a pulled-back Guess loses its Marks (it is edited and entered again)", () => {
  let b = add(startOver(), "crane");
  b = cycleMark(b, 0, 2);
  b = backspace(b);
  b = enterGuess(b);
  expect(b.rows[0].marks).toEqual([0, 0, 0, 0, 0]);
});

test("tiles cycle Absent, Present, Correct, Absent", () => {
  expect([0, 1, 2].map((m) => nextMark(m as 0 | 1 | 2))).toEqual([1, 2, 0]);
  let b = add(startOver(), "crane");
  for (const expected of [1, 2, 0] as const) {
    b = cycleMark(b, 0, 3);
    expect(b.rows[0].marks[3]).toBe(expected);
  }
  expect(b.rows[0].marks.filter((m) => m !== 0)).toHaveLength(0);
  expect(cycleMark(b, 5, 0)).toBe(b);
  expect(cycleMark(b, 0, 5)).toBe(b);
});

test("an all-Correct row is a Win and stops input", () => {
  let b = add(startOver(), "crane");
  expect(isWin(b.rows)).toBe(false);
  for (let p = 0; p < 5; p++) b = cycleMark(cycleMark(b, 0, p), 0, p);
  expect(isWin(b.rows)).toBe(true);
  expect(canType(b.rows)).toBe(false);
  expect(typeLetter(b, "a")).toBe(b);
  expect(enterGuess({ ...b, typed: "slate" })).toEqual({ ...b, typed: "slate" });
  // Backspace still takes the winning row back.
  expect(backspace(b).typed).toBe("crane");
});

test("at most six Guesses", () => {
  let b = startOver();
  for (const w of ["crane", "slate", "pious", "light", "mound", "fresh", "extra"]) b = add(b, w);
  expect(b.rows).toHaveLength(6);
  expect(canType(b.rows)).toBe(false);
  expect(b.typed).toBe("");
  expect(typeLetter(b, "x").typed).toBe("");
});

test("the State text round-trips through the board", () => {
  let b = add(add(startOver(), "crane"), "slate");
  b = cycleMark(b, 0, 2);
  b = cycleMark(cycleMark(b, 1, 1), 1, 1);
  const text = formatState(b.rows);
  expect(text).toBe("crane:00100,slate:02000");
  expect(rowsFromState(text)).toEqual(b.rows);
  expect(parseState(text)).toEqual(b.rows);
});

test("rowsFromState drops partial words and bad rows, and caps at six", () => {
  expect(rowsFromState("cra,crane:00102,slate:9,zzzzz")).toEqual([
    { guess: "crane", marks: [0, 0, 1, 0, 2] },
    { guess: "zzzzz", marks: [0, 0, 0, 0, 0] },
  ]);
  expect(rowsFromState("")).toEqual([]);
  expect(rowsFromState("a1:00000,b1:00000")).toEqual([]);
});
