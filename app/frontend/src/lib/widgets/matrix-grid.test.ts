import { expect, test } from "bun:test";
import candidatesWatch from "@/lib/widgets/fixtures/candidates-watch-crane.json";
import solveCrane from "@/lib/widgets/fixtures/solve-crane-crane.json";
import solveWatch from "@/lib/widgets/fixtures/solve-watch-crane.json";
import { CENTRE_PARAM_DEFAULT, DIM_ALPHA, FADE_MS, FIT, MAX_CELL_PX, MIDDLE_CODE, PLAY_STEP_MS, SCALE_STEPS, type Viewport, WIN_CODE, ZOOM_PARAM_DEFAULT, answerIndex, axisTicks, buildScale, cellAt, cellRect, clampViewport, colourIndex, dimmedMask, fadeProgress, fillCandidateRow, fillDimRow, fillGrid, gridBox, guessRows, letterSpans, marksOfCode, maxZoom, mixLevels, panBy, parseHex, parseViewport, playNext, playStart, sizesPerStep, stateKey, statesPerStep, viewportParams, visibleCells, zoomAround } from "@/lib/widgets/matrix-grid";
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

test("maxZoom lets a cell grow to MAX_CELL_PX and never goes under fit", () => {
  expect(maxZoom(463, 2315)).toBe((MAX_CELL_PX * 2315) / 463);
  expect(maxZoom(1000, 10)).toBe(1);
  expect(maxZoom(0, 2315)).toBe(1);
  expect(maxZoom(500, 0)).toBe(1);
});

test("clampViewport keeps the zoom from fit to the most, and the frame on the grid", () => {
  expect(clampViewport(FIT, 50)).toEqual(FIT);
  // At fit the only centre is the grid's middle.
  expect(clampViewport({ zoom: 1, x: 0.1, y: 0.9 }, 50)).toEqual(FIT);
  expect(clampViewport({ zoom: 0.5, x: 0.5, y: 0.5 }, 50)).toEqual(FIT);
  expect(clampViewport({ zoom: 80, x: 0.5, y: 0.5 }, 50).zoom).toBe(50);
  // At 4× the frame shows a quarter of the grid, so its centre stays from 1/8 to 7/8.
  expect(clampViewport({ zoom: 4, x: 0, y: 1 }, 50)).toEqual({ zoom: 4, x: 0.125, y: 0.875 });
  expect(clampViewport({ zoom: 4, x: 0.3, y: 0.6 }, 50)).toEqual({ zoom: 4, x: 0.3, y: 0.6 });
  expect(clampViewport({ zoom: Number.NaN, x: Number.NaN, y: 0.5 }, 50)).toEqual(FIT);
});

test("gridBox puts the centre in the frame's middle", () => {
  expect(gridBox(FIT, 500)).toEqual({ left: 0, top: 0, size: 500 });
  expect(gridBox({ zoom: 2, x: 0.25, y: 0.75 }, 500)).toEqual({ left: 0, top: -500, size: 1000 });
});

test("zoomAround keeps the grid point under the pointer where it was", () => {
  const fit = 500;
  const max = 100;
  const at = (view: Viewport, px: number, py: number) => {
    const box = gridBox(view, fit);
    return [(px - box.left) / box.size, (py - box.top) / box.size];
  };
  let view = FIT;
  for (const [factor, px, py] of [[2, 100, 300], [3, 400, 50], [1.5, 250, 250], [0.5, 10, 490]] as const) {
    const before = at(view, px, py);
    view = zoomAround(view, factor, px, py, fit, max);
    const after = at(view, px, py);
    expect(after[0]).toBeCloseTo(before[0], 9);
    expect(after[1]).toBeCloseTo(before[1], 9);
  }
  expect(view.zoom).toBeCloseTo(4.5);
  // Zooming out past fit lands on fit, centred.
  expect(zoomAround(view, 0.01, 123, 456, fit, max)).toEqual(FIT);
  // Not past the most zoom.
  expect(zoomAround(FIT, 1000, 250, 250, fit, max).zoom).toBe(max);
});

test("zoomAround at the grid's corner keeps the frame on the grid", () => {
  const view = zoomAround(FIT, 8, 0, 0, 500, 100);
  expect(view).toEqual({ zoom: 8, x: 1 / 16, y: 1 / 16 });
  const corner = gridBox(view, 500);
  expect(corner.left).toBeCloseTo(0);
  expect(corner.top).toBeCloseTo(0);
  // Zooming out from a corner (the pointer's point would leave the frame on the grid's far side) is clamped too.
  const out = zoomAround({ zoom: 8, x: 1 / 16, y: 1 / 16 }, 0.5, 500, 500, 500, 100);
  expect(out).toEqual({ zoom: 4, x: 1 / 8, y: 1 / 8 });
});

test("panBy drags the grid with the pointer and stops at its edges", () => {
  const fit = 500;
  const view = { zoom: 4, x: 0.5, y: 0.5 };
  // Dragging right by 100 px moves the view left by 100 / 2000 of the grid.
  expect(panBy(view, 100, -200, fit, 50)).toEqual({ zoom: 4, x: 0.45, y: 0.6 });
  expect(panBy(view, 1e6, -1e6, fit, 50)).toEqual({ zoom: 4, x: 0.125, y: 0.875 });
  // At fit there is nowhere to go.
  expect(panBy(FIT, 40, 40, fit, 50)).toEqual(FIT);
  expect(panBy(view, 5, 5, 0, 50)).toBe(view);
});

test("cellAt finds the cell under a pixel at fit, up to the grid's edges", () => {
  const side = 2315;
  const fit = 463; // a fifth of a pixel per cell at fit
  expect(cellAt(0, 0, FIT, fit, side)).toEqual({ row: 0, col: 0 });
  expect(cellAt(fit - 0.001, fit - 0.001, FIT, fit, side)).toEqual({ row: side - 1, col: side - 1 });
  expect(cellAt(fit - 0.001, 0, FIT, fit, side)).toEqual({ row: 0, col: side - 1 });
  expect(cellAt(0, fit - 0.001, FIT, fit, side)).toEqual({ row: side - 1, col: 0 });
  expect(cellAt(fit / 2, fit / 2, FIT, fit, side)).toEqual({ row: 1157, col: 1157 });
  // Outside the frame: left of, above, on the far edge and past it.
  expect(cellAt(-0.001, 0, FIT, fit, side)).toBeNull();
  expect(cellAt(0, -1, FIT, fit, side)).toBeNull();
  expect(cellAt(fit, 0, FIT, fit, side)).toBeNull();
  expect(cellAt(0, fit + 5, FIT, fit, side)).toBeNull();
  expect(cellAt(0, 0, FIT, fit, 0)).toBeNull();
  expect(cellAt(0, 0, FIT, 0, side)).toBeNull();
});

test("cellAt picks single cells when zoomed in and panned", () => {
  // 10 cells in a 50 px frame: 5 px a cell at fit, 40 px at 8×.
  expect(cellAt(4.99, 5, FIT, 50, 10)).toEqual({ row: 1, col: 0 });
  // At 8× centred on the grid's middle, the frame's top-left corner is at grid pixel (200 - 25, 200 - 25).
  const middle = { zoom: 8, x: 0.5, y: 0.5 };
  expect(cellAt(0, 0, middle, 50, 10)).toEqual({ row: 4, col: 4 });
  expect(cellAt(5, 25, middle, 50, 10)).toEqual({ row: 5, col: 4 });
  expect(cellAt(5, 24.99, middle, 50, 10)).toEqual({ row: 4, col: 4 });
  // Panned to the bottom-right corner: the frame's far corner is the last cell.
  const corner = clampViewport({ zoom: 8, x: 1, y: 1 }, 8);
  expect(cellAt(49.99, 49.99, corner, 50, 10)).toEqual({ row: 9, col: 9 });
  expect(cellAt(0, 0, corner, 50, 10)).toEqual({ row: 8, col: 8 });
  expect(cellAt(50, 10, corner, 50, 10)).toBeNull();
});

test("cellRect is where cellAt finds the cell, at any zoom and centre", () => {
  const side = 2315;
  const fit = 700;
  for (const view of [FIT, { zoom: 2, x: 0.3, y: 0.6 }, { zoom: 37.5, x: 0.5, y: 0.5 }, clampViewport({ zoom: 64, x: 1, y: 0 }, 64)]) {
    const { col0, col1, row0, row1 } = visibleCells(view, fit, side);
    for (const cell of [{ row: row0, col: col0 }, { row: row1 - 1, col: col1 - 1 }, { row: (row0 + row1) >> 1, col: (col0 + col1) >> 1 }]) {
      const rect = cellRect(cell, view, fit, side);
      expect(rect.size).toBeCloseTo((fit * view.zoom) / side);
      const x = Math.min(Math.max(rect.x + rect.size / 2, 0), fit - 0.001);
      const y = Math.min(Math.max(rect.y + rect.size / 2, 0), fit - 0.001);
      expect(cellAt(x, y, view, fit, side)).toEqual(cell);
    }
  }
  expect(cellRect({ row: 0, col: 0 }, FIT, fit, side)).toEqual({ x: 0, y: 0, size: fit / side });
  const last = cellRect({ row: side - 1, col: side - 1 }, FIT, fit, side);
  expect(last.x + last.size).toBeCloseTo(fit);
});

test("visibleCells covers the frame and no more", () => {
  expect(visibleCells(FIT, 500, 2315)).toEqual({ col0: 0, col1: 2315, row0: 0, row1: 2315 });
  // 10 cells, 8× in a 50 px frame centred: grid pixels 175 to 225, cells 4.375 to 5.625.
  expect(visibleCells({ zoom: 8, x: 0.5, y: 0.5 }, 50, 10)).toEqual({ col0: 4, col1: 6, row0: 4, row1: 6 });
  expect(visibleCells(clampViewport({ zoom: 8, x: 0, y: 1 }, 8), 50, 10)).toEqual({ col0: 0, col1: 2, row0: 8, row1: 10 });
  expect(visibleCells(FIT, 0, 10)).toEqual({ col0: 0, col1: 0, row0: 0, row1: 0 });
});

test("parseViewport reads zoom and centre, and the old stepped zoom levels", () => {
  expect(parseViewport(null, null)).toEqual(FIT);
  expect(parseViewport("fit", null)).toEqual(FIT);
  for (const zoom of ["2", "4", "8"]) expect(parseViewport(zoom, null)).toEqual({ zoom: Number(zoom), x: 0.5, y: 0.5 });
  expect(parseViewport("12.5", "0.25,0.75")).toEqual({ zoom: 12.5, x: 0.25, y: 0.75 });
  expect(parseViewport("0.5", "0.2,0.2")).toEqual({ zoom: 1, x: 0.2, y: 0.2 });
  expect(parseViewport("big", "1.5,0.2")).toEqual(FIT);
  expect(parseViewport("3", "0.2")).toEqual({ zoom: 3, x: 0.5, y: 0.5 });
  expect(parseViewport("3", ",0.2")).toEqual({ zoom: 3, x: 0.5, y: 0.5 });
});

test("viewportParams writes fit as the defaults and round-trips through parseViewport", () => {
  expect(viewportParams(FIT)).toEqual({ zoom: ZOOM_PARAM_DEFAULT, centre: CENTRE_PARAM_DEFAULT });
  const params = viewportParams({ zoom: 12.3456, x: 0.1234567, y: 0.9 });
  expect(params).toEqual({ zoom: "12.35", centre: "0.12346,0.9" });
  expect(parseViewport(params.zoom, params.centre)).toEqual({ zoom: 12.35, x: 0.12346, y: 0.9 });
});

test("letterSpans gives each first letter of the Answer List its words, x none", () => {
  const spans = letterSpans(answers);
  expect(spans.map((s) => s.letter).join("")).toBe("abcdefghijklmnopqrstuvwyz");
  expect(spans[0]).toEqual({ letter: "a", start: 0, end: 141 });
  expect(spans[spans.length - 1]).toEqual({ letter: "z", start: answers.length - 3, end: answers.length });
  expect(spans.find((s) => s.letter === "s")).toMatchObject({ start: answers.findIndex((w) => w[0] === "s") });
  for (let i = 1; i < spans.length; i++) expect(spans[i].start).toBe(spans[i - 1].end);
  expect(letterSpans([])).toEqual([]);
  expect(letterSpans(["ab", "ac", "b", "d"])).toEqual([
    { letter: "a", start: 0, end: 2 },
    { letter: "b", start: 2, end: 3 },
    { letter: "d", start: 3, end: 4 },
  ]);
});

test("axisTicks puts a tick at each letter's first word and drops crowded labels, keeping the ticks", () => {
  const spans = letterSpans(answers);
  const fit = 400;
  const ticks = axisTicks(spans, 0, fit, answers.length, fit, 12);
  expect(ticks).toHaveLength(25);
  ticks.forEach((t, i) => expect(t.at).toBeCloseTo((spans[i].start * fit) / answers.length));
  const labels = ticks.flatMap((t) => (t.label === null ? [] : [t.label])).sort((a, b) => a - b);
  for (let i = 1; i < labels.length; i++) expect(labels[i] - labels[i - 1]).toBeGreaterThanOrEqual(12);
  // The big letters keep their labels, centred on their span; y (6 words) and z (3) are too thin at fit for both.
  const s = ticks.find((t) => t.letter === "s");
  const span = spans.find((p) => p.letter === "s")!;
  expect(s?.label).toBeCloseTo((((span.start + span.end) / 2) * fit) / answers.length);
  expect(ticks.filter((t) => t.letter === "y" || t.letter === "z").filter((t) => t.label !== null).length).toBeLessThan(2);
  // Zoomed in on the end of the list, y and z both get their labels.
  const view = clampViewport({ zoom: 60, x: 1, y: 1 }, 100);
  const box = gridBox(view, fit);
  const end = axisTicks(spans, box.left, box.size, answers.length, fit, 12);
  expect(end.map((t) => t.letter)).toEqual(["w", "y", "z"]);
  expect(end.every((t) => t.label !== null)).toBe(true);
});

test("axisTicks keeps the label of a letter whose first word is out of view, on the part in view", () => {
  const spans = [
    { letter: "a", start: 0, end: 50 },
    { letter: "b", start: 50, end: 100 },
  ];
  // 100 cells, 1000 px wide, shifted so cells 20 to 70 are in a 500 px frame.
  const ticks = axisTicks(spans, -200, 1000, 100, 500, 10);
  expect(ticks).toEqual([
    { letter: "a", at: null, label: 150 },
    { letter: "b", at: 300, label: 400 },
  ]);
  // A letter wholly out of view has no tick.
  expect(axisTicks(spans, -600, 1000, 100, 300, 10).map((t) => t.letter)).toEqual(["b"]);
  // A label near the axis's end is kept gap / 2 in.
  expect(axisTicks([{ letter: "q", start: 99, end: 100 }], 0, 1000, 100, 1000, 10)[0]).toEqual({ letter: "q", at: 990, label: 995 });
  expect(axisTicks(spans, 0, 0, 100, 500, 10)).toEqual([]);
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

test("fillDimRow veils a column mid-fade in proportion to its level", () => {
  const out = new Uint8ClampedArray(3 * 4);
  fillDimRow(new Float32Array([0, 0.5, 1]), [10, 20, 30], out, 1);
  expect([...out]).toEqual([10, 20, 30, 0, 10, 20, 30, 128, 10, 20, 30, 255]);
});

test("mixLevels runs from the levels shown to the step's mask", () => {
  const from = new Uint8Array([0, 1, 1, 0]);
  const to = new Uint8Array([0, 1, 0, 1]);
  const out = new Float32Array(4);
  mixLevels(from, to, 0, out);
  expect([...out]).toEqual([0, 1, 1, 0]);
  mixLevels(from, to, 0.25, out);
  expect([...out]).toEqual([0, 1, 0.75, 0.25]);
  mixLevels(from, to, 1, out);
  expect([...out]).toEqual([0, 1, 0, 1]);
  mixLevels(from, to, 3, out);
  expect([...out]).toEqual([0, 1, 0, 1]);
  // A fade that starts mid-fade carries on from the levels on the screen.
  mixLevels(new Float32Array([0.5, 0.5]), new Uint8Array([1, 0]), 0.5, out.subarray(0, 2));
  expect([...out.subarray(0, 2)]).toEqual([0.75, 0.25]);
  expect(() => mixLevels(from, new Uint8Array(3), 0, out)).toThrow();
});

test("fadeProgress eases from 0 to 1 over the fade and stays there", () => {
  expect(fadeProgress(-5)).toBe(0);
  expect(fadeProgress(0)).toBe(0);
  expect(fadeProgress(FADE_MS / 2)).toBe(0.5);
  expect(fadeProgress(FADE_MS)).toBe(1);
  expect(fadeProgress(FADE_MS * 3)).toBe(1);
  expect(fadeProgress(10, 0)).toBe(1);
  let before = 0;
  for (let ms = 0; ms <= FADE_MS; ms += 10) {
    const t = fadeProgress(ms);
    expect(t).toBeGreaterThanOrEqual(before);
    before = t;
  }
  // Gentle at both ends: the first and last tenths move less than a tenth.
  expect(fadeProgress(FADE_MS / 10)).toBeLessThan(0.1);
  expect(fadeProgress((FADE_MS * 9) / 10)).toBeGreaterThan(0.9);
  expect(FADE_MS).toBeLessThan(PLAY_STEP_MS);
});

test("Play starts from the current step, from step 0 at the Win, and stops at the Win", () => {
  expect(playStart(0, 4)).toBe(0);
  expect(playStart(2, 4)).toBe(2);
  expect(playStart(4, 4)).toBe(0);
  expect(playNext(0, 4)).toBe(1);
  expect(playNext(3, 4)).toBe(4);
  expect(playNext(4, 4)).toBeNull();
});

test("fillCandidateRow paints Candidates one colour and the rest another, mixed mid-fade", () => {
  const out = new Uint8ClampedArray(3 * 4);
  fillCandidateRow(new Float32Array([0, 0.5, 1]), [0, 100, 200], [200, 100, 0], out);
  expect([...out]).toEqual([0, 100, 200, 255, 100, 100, 100, 255, 200, 100, 0, 255]);
  expect(() => fillCandidateRow(new Uint8Array(2), [0, 0, 0], [0, 0, 0], out)).toThrow();
});
