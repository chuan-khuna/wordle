import { expect, test } from "bun:test";
import candidatesWatch from "@/lib/widgets/fixtures/candidates-watch-crane.json";
import solveCrane from "@/lib/widgets/fixtures/solve-crane-crane.json";
import solveWatch from "@/lib/widgets/fixtures/solve-watch-crane.json";
import { DIM_ALPHA, MIDDLE_CODE, SCALE_STEPS, WIN_CODE, ZOOMS, answerIndex, buildScale, cellAt, cellRect, colourIndex, dimmedMask, fillDimRow, fillGrid, gridSize, guessRows, marksOfCode, parseHex, parseZoom, sizesPerStep, stateKey, statesPerStep, zoomFactor } from "@/lib/widgets/matrix-grid";
import { answerList } from "@/lib/wordle/words";

const answers = answerList();

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

test("statesPerStep starts with no Guess and adds one Guess a step", () => {
  const states = statesPerStep(solveWatch);
  expect(states).toHaveLength(5);
  expect(states[0]).toEqual([]);
  expect(states[2]).toEqual([
    { guess: "crane", feedback: "10100" },
    { guess: "moist", feedback: "00001" },
  ]);
  expect(stateKey(states[0])).toBe("");
  expect(stateKey(states[2])).toBe("crane:10100,moist:00001");
});

test("sizesPerStep runs from the whole Answer List to the Win", () => {
  expect(sizesPerStep(solveWatch)).toEqual([2315, 27, 6, 1, 1]);
  expect(sizesPerStep({ steps: [] })).toEqual([]);
});

test("an Answer equal to the Opener is one step from the whole Answer List to 1", () => {
  expect(solveCrane.steps[0].guess).toBe("crane");
  expect(sizesPerStep(solveCrane)).toEqual([2315, 1]);
  expect(statesPerStep(solveCrane)).toEqual([[], [{ guess: "crane", feedback: "22222" }]]);
  const row = answerIndex(answers, "crane");
  expect(guessRows(solveCrane, answers)).toEqual([row]);
  const mask = dimmedMask(answers, ["crane"]);
  expect(mask[row]).toBe(0);
  expect(mask.reduce((n, m) => n + m, 0)).toBe(answers.length - 1);
});

test("answerIndex finds a word's place in the sorted Answer List, -1 off it", () => {
  expect(answerIndex(answers, answers[0])).toBe(0);
  expect(answerIndex(answers, answers[answers.length - 1])).toBe(answers.length - 1);
  expect(answers[answerIndex(answers, "watch")]).toBe("watch");
  expect(answerIndex(answers, "blowy")).toBe(-1);
  expect(answerIndex(answers, "tarse")).toBe(-1);
  expect(answerIndex([], "watch")).toBe(-1);
});

test("guessRows gives each Guess on the Answer List its row and a Guess List Guess none", () => {
  // BLOWY is on the Guess List only.
  expect(guessRows(solveWatch, answers)).toEqual([answerIndex(answers, "crane"), answerIndex(answers, "moist"), null, answerIndex(answers, "watch")]);
});

test("dimmedMask dims nothing at step 0 and every non-Candidate after each Guess", () => {
  expect(dimmedMask(answers, null).every((m) => m === 0)).toBe(true);
  const sizes = sizesPerStep(solveWatch);
  candidatesWatch.forEach((words, k) => {
    const mask = dimmedMask(answers, words);
    expect(mask).toHaveLength(answers.length);
    const lit = answers.filter((_, col) => mask[col] === 0);
    expect(lit).toEqual(words);
    expect(lit).toHaveLength(sizes[k + 1]);
    expect(mask[answerIndex(answers, "watch")]).toBe(0);
  });
});

test("dimmedMask ignores a word off the Answer List", () => {
  const mask = dimmedMask(answers, ["watch", "blowy"]);
  expect(mask.reduce((n, m) => n + m, 0)).toBe(answers.length - 1);
});

test("fillDimRow veils the dimmed columns and leaves the lit ones clear", () => {
  const out = new Uint8ClampedArray(3 * 4);
  fillDimRow(new Uint8Array([1, 0, 1]), [10, 20, 30], out);
  const a = Math.round(DIM_ALPHA * 255);
  expect([...out]).toEqual([10, 20, 30, a, 10, 20, 30, 0, 10, 20, 30, a]);
  expect(() => fillDimRow(new Uint8Array(2), [0, 0, 0], out)).toThrow();
});
