import { expect, test } from "bun:test";
import { MIDDLE_CODE, SCALE_STEPS, WIN_CODE, buildScale, colourIndex, fillGrid, marksOfCode, parseHex } from "@/lib/widgets/matrix-grid";

test("colourIndex puts all Absent at the bottom of the scale and the Win at the top", () => {
  expect(colourIndex(0)).toBe(0);
  expect(colourIndex(WIN_CODE)).toBe(SCALE_STEPS - 1);
});

test("colourIndex puts the middle code (all Present) in the middle of the scale", () => {
  expect(colourIndex(MIDDLE_CODE)).toBe(31);
  expect(colourIndex(MIDDLE_CODE, 3)).toBe(1);
});

test("colourIndex never goes down and stays on the scale", () => {
  let before = 0;
  for (let code = 0; code <= WIN_CODE; code++) {
    const index = colourIndex(code);
    expect(index).toBeGreaterThanOrEqual(before);
    expect(index).toBeLessThan(SCALE_STEPS);
    before = index;
  }
  expect(colourIndex(-1)).toBe(0);
  expect(colourIndex(500)).toBe(SCALE_STEPS - 1);
});

test("marksOfCode reads a Feedback Code as five base-3 digits", () => {
  expect(marksOfCode(0)).toBe("00000");
  expect(marksOfCode(MIDDLE_CODE)).toBe("11111");
  expect(marksOfCode(WIN_CODE)).toBe("22222");
  expect(marksOfCode(parseInt("20102", 3))).toBe("20102");
});

test("parseHex reads the themes' hex colours", () => {
  expect(parseHex("#286983")).toEqual([0x28, 0x69, 0x83]);
  expect(parseHex(" #FfF ")).toEqual([255, 255, 255]);
  expect(parseHex("rgb(1, 2, 3)")).toBeNull();
  expect(parseHex("")).toBeNull();
});

test("buildScale runs from the first stop to the last through the middle one", () => {
  const scale = buildScale([[0, 0, 0], [100, 100, 100], [200, 0, 50]], 5);
  const colour = (i: number) => [...scale.subarray(i * 4, i * 4 + 4)];
  expect(colour(0)).toEqual([0, 0, 0, 255]);
  expect(colour(1)).toEqual([50, 50, 50, 255]);
  expect(colour(2)).toEqual([100, 100, 100, 255]);
  expect(colour(4)).toEqual([200, 0, 50, 255]);
});

test("fillGrid paints each cell its code's colour", () => {
  const scale = buildScale([[0, 0, 0], [255, 255, 255]], 2);
  const cells = new Uint8Array([0, WIN_CODE, MIDDLE_CODE - 1, MIDDLE_CODE + 1]);
  const out = new Uint8ClampedArray(cells.length * 4);
  fillGrid(cells, scale, out);
  expect([...out]).toEqual([0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255]);
  expect(() => fillGrid(cells, scale, new Uint8ClampedArray(4))).toThrow();
});
