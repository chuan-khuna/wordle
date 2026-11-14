import { expect, test } from "bun:test";
import { MIDDLE_CODE, SCALE_STEPS, WIN_CODE, ZOOMS, buildScale, cellAt, cellRect, colourIndex, fillGrid, gridSize, marksOfCode, parseHex, parseZoom, zoomFactor } from "@/lib/widgets/matrix-grid";

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

test("parseZoom reads the zoom levels and falls back to fit", () => {
  for (const zoom of ZOOMS) expect(parseZoom(zoom)).toBe(zoom);
  expect(parseZoom(null)).toBe("fit");
  expect(parseZoom("3")).toBe("fit");
  expect(parseZoom("")).toBe("fit");
  expect(ZOOMS.map(zoomFactor)).toEqual([1, 2, 4, 8]);
  expect(gridSize(500, "4")).toBe(2000);
});

test("cellAt finds the cell under a pixel at every zoom, up to the grid's edges", () => {
  const side = 2315;
  const fit = 463; // a fifth of a pixel per cell at fit
  for (const zoom of ZOOMS) {
    const size = gridSize(fit, zoom);
    expect(cellAt(0, 0, fit, zoom, side)).toEqual({ row: 0, col: 0 });
    expect(cellAt(size - 0.001, size - 0.001, fit, zoom, side)).toEqual({ row: side - 1, col: side - 1 });
    expect(cellAt(size - 0.001, 0, fit, zoom, side)).toEqual({ row: 0, col: side - 1 });
    expect(cellAt(0, size - 0.001, fit, zoom, side)).toEqual({ row: side - 1, col: 0 });
    // Off the grid: left of, above, on the far edge and past it.
    expect(cellAt(-0.001, 0, fit, zoom, side)).toBeNull();
    expect(cellAt(0, -1, fit, zoom, side)).toBeNull();
    expect(cellAt(size, 0, fit, zoom, side)).toBeNull();
    expect(cellAt(0, size + 5, fit, zoom, side)).toBeNull();
    // The middle of the grid is the middle cell.
    expect(cellAt(size / 2, size / 2, fit, zoom, side)).toEqual({ row: 1157, col: 1157 });
  }
});

test("cellAt picks single cells once a cell is wider than a pixel", () => {
  // 10 cells in 50 px: 5 px a cell at fit, 40 px at 8×.
  expect(cellAt(4.99, 5, 50, "fit", 10)).toEqual({ row: 1, col: 0 });
  expect(cellAt(39.9, 40, 50, "8", 10)).toEqual({ row: 1, col: 0 });
  expect(cellAt(80, 0, 50, "2", 10)).toEqual({ row: 0, col: 8 });
  expect(cellAt(0, 0, 50, "fit", 0)).toBeNull();
});

test("cellRect is where cellAt finds the cell, at every zoom", () => {
  const side = 2315;
  const fit = 700;
  for (const zoom of ZOOMS) {
    for (const cell of [{ row: 0, col: 0 }, { row: side - 1, col: side - 1 }, { row: 12, col: 2000 }, { row: side - 1, col: 0 }]) {
      const rect = cellRect(cell, fit, zoom, side);
      expect(rect.size).toBeCloseTo((fit * zoomFactor(zoom)) / side);
      expect(cellAt(rect.x + rect.size / 2, rect.y + rect.size / 2, fit, zoom, side)).toEqual(cell);
    }
  }
  expect(cellRect({ row: 0, col: 0 }, fit, "8", side)).toEqual({ x: 0, y: 0, size: (fit * 8) / side });
  const last = cellRect({ row: side - 1, col: side - 1 }, fit, "2", side);
  expect(last.x + last.size).toBeCloseTo(fit * 2);
});
