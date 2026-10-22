import { describe, expect, test } from "bun:test";
import { readingState } from "./reading-progress";

describe("readingState", () => {
  // Three sections: 100 to 300, 300 to 400, 400 to 800 (the end of the body).
  const tops = [100, 300, 400];

  test("above the first heading nothing is read", () => {
    expect(readingState(tops, 800, 50, false)).toEqual({ current: null, progress: [0, 0, 0] });
  });

  test("halfway through the first section", () => {
    expect(readingState(tops, 800, 200, false)).toEqual({ current: 0, progress: [0.5, 0, 0] });
  });

  test("earlier sections are full, the current one partly read", () => {
    expect(readingState(tops, 800, 500, false)).toEqual({ current: 2, progress: [1, 1, 0.25] });
  });

  test("at the bottom of the page every section is read", () => {
    expect(readingState(tops, 800, 450, true)).toEqual({ current: 2, progress: [1, 1, 1] });
  });

  test("no headings", () => {
    expect(readingState([], 800, 200, false)).toEqual({ current: null, progress: [] });
  });
});
