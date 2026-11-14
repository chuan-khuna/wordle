/**
 * The Feedback Matrix page's grid, as pure functions: the colour scale a Feedback Code is drawn in, and the
 * one-pixel-per-cell image the canvas scales up. The page draws the Answer × Answer Feedback Matrix, row by row:
 * rows Guesses, columns Answers, both in Answer List order.
 */

/** The highest Feedback Code: every letter Correct, a Win. */
export const WIN_CODE = 242;
/** Every letter Present: the code halfway up the scale, shown in the legend. */
export const MIDDLE_CODE = 121;
/** The Feedbacks the legend labels as Tiles, low to high. */
export const LEGEND_CODES = [0, MIDDLE_CODE, WIN_CODE] as const;

/** How many colours the scale has. The 243 Feedback Codes fall into this many equal bins. */
export const SCALE_STEPS = 64;

/**
 * The theme roles the scale runs through, low code to high: the panel colour (all Absent), the Present colour, the
 * Correct colour (the Win). Read from the theme's CSS variables, so the scale follows the theme.
 */
export const SCALE_ROLES = ["--overlay", "--present", "--correct"] as const;

export type Rgb = readonly [number, number, number];

/** The colour index of a Feedback Code on a scale of `steps` colours: equal bins, 0 at the bottom, 242 at the top. */
export function colourIndex(code: number, steps: number = SCALE_STEPS): number {
  const clamped = Math.min(WIN_CODE, Math.max(0, Math.floor(code)));
  return Math.min(steps - 1, Math.floor((clamped * steps) / (WIN_CODE + 1)));
}

/** The five Marks of a Feedback Code as digits, first letter first: 121 is "11111". */
export function marksOfCode(code: number): string {
  let marks = "";
  for (let place = 4; place >= 0; place--) marks += Math.floor(code / 3 ** place) % 3;
  return marks;
}

/** A CSS hex colour (`#rgb` or `#rrggbb`, as the themes write them) as RGB, or null if it is not one. */
export function parseHex(css: string): Rgb | null {
  const hex = css.trim().replace(/^#/, "");
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return null;
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as unknown as Rgb;
}

/**
 * The scale as RGBA bytes, `steps` colours long: the `stops` spread evenly from the first colour to the last,
 * mixed linearly between neighbours. Every colour is opaque.
 */
export function buildScale(stops: readonly Rgb[], steps: number = SCALE_STEPS): Uint8ClampedArray {
  const scale = new Uint8ClampedArray(steps * 4);
  for (let i = 0; i < steps; i++) {
    const at = steps === 1 ? 0 : (i / (steps - 1)) * (stops.length - 1);
    const lo = Math.min(stops.length - 1, Math.floor(at));
    const hi = Math.min(stops.length - 1, lo + 1);
    const t = at - lo;
    for (let c = 0; c < 3; c++) scale[i * 4 + c] = Math.round(stops[lo][c] + (stops[hi][c] - stops[lo][c]) * t);
    scale[i * 4 + 3] = 255;
  }
  return scale;
}

/**
 * Fill `out` (RGBA, four bytes per cell, as an `ImageData`'s `data`) with each cell's colour on `scale`.
 * Each Feedback Code's colour is looked up once, then copied cell by cell.
 */
export function fillGrid(cells: Uint8Array, scale: Uint8ClampedArray, out: Uint8ClampedArray): void {
  if (out.length !== cells.length * 4) throw new Error(`the image has ${out.length / 4} pixels for ${cells.length} cells`);
  const steps = scale.length / 4;
  // One packed RGBA word per Feedback Code, written through a 32-bit view (in the platform's byte order).
  const words = new Uint32Array(WIN_CODE + 1);
  const bytes = new Uint8Array(words.buffer);
  for (let code = 0; code <= WIN_CODE; code++) bytes.set(scale.subarray(colourIndex(code, steps) * 4, colourIndex(code, steps) * 4 + 4), code * 4);
  const target = new Uint32Array(out.buffer, out.byteOffset, cells.length);
  for (let i = 0; i < cells.length; i++) target[i] = words[cells[i]];
}

/** The zoom levels, as the `zoom` URL param writes them: the whole grid fits the frame, or 2, 4 or 8 times that. */
export const ZOOMS = ["fit", "2", "4", "8"] as const;
export type Zoom = (typeof ZOOMS)[number];

/** A `zoom` URL param as a zoom level: anything that is not one is `fit`. */
export function parseZoom(text: string | null | undefined): Zoom {
  return (ZOOMS as readonly string[]).includes(text ?? "") ? (text as Zoom) : "fit";
}

/** How many times the fitted width a zoom level draws the grid. */
export function zoomFactor(zoom: Zoom): number {
  return zoom === "fit" ? 1 : Number(zoom);
}

/** The grid's side in CSS pixels at a zoom level, when it fits a frame `fitWidth` wide. */
export function gridSize(fitWidth: number, zoom: Zoom): number {
  return fitWidth * zoomFactor(zoom);
}

/** A cell of the grid: its row (the Guess) and its column (the Answer), both indices into the Answer List. */
export type Cell = { row: number; col: number };

/**
 * The cell under the point (`x`, `y`) on the grid, in CSS pixels from the grid's top-left corner, when the grid of
 * `side` × `side` cells fits a frame `fitWidth` wide and is drawn at `zoom`; null off the grid. A cell covers
 * [start, end) on each axis, so a point on the line between two cells is in the later one.
 */
export function cellAt(x: number, y: number, fitWidth: number, zoom: Zoom, side: number): Cell | null {
  const size = gridSize(fitWidth, zoom);
  if (side <= 0 || size <= 0 || !(x >= 0 && y >= 0 && x < size && y < size)) return null;
  const index = (p: number) => Math.min(side - 1, Math.floor((p * side) / size));
  return { row: index(y), col: index(x) };
}

/** Where a cell is drawn: its top-left corner and side in CSS pixels from the grid's top-left corner, as for `cellAt`. */
export function cellRect(cell: Cell, fitWidth: number, zoom: Zoom, side: number): { x: number; y: number; size: number } {
  const step = gridSize(fitWidth, zoom) / side;
  return { x: cell.col * step, y: cell.row * step, size: step };
}

/** The Game the page plays: the Solver's Guesses, each with its Feedback, as `GET /api/solve` returns them. */
export type GameSteps = { steps: readonly { guess: string; marks: string; candidates_before: number; candidates_after: number }[] };

/** One Guess and its Feedback as the API's `state` takes it (Feedback as a digit string). */
export type StateRow = { guess: string; feedback: string };

/** The State after each step of a Game: step 0 has no Guess, step k holds Guesses 1 to k. One more entry than the Game has Guesses. */
export function statesPerStep(game: GameSteps): StateRow[][] {
  return Array.from({ length: game.steps.length + 1 }, (_, k) => game.steps.slice(0, k).map((s) => ({ guess: s.guess, feedback: s.marks })));
}

/** A State as one key ("crane:10100,moist:00001"; "" for step 0), for caching its Candidate Set. */
export function stateKey(state: readonly StateRow[]): string {
  return state.map((s) => `${s.guess}:${s.feedback}`).join(",");
}

/**
 * The Candidate Set's size at each step of a Game: step 0 is the whole Answer List (Guess 1's `candidates_before`),
 * step k what is left after Guess k. The step of the Win leaves 1.
 */
export function sizesPerStep(game: GameSteps): number[] {
  if (game.steps.length === 0) return [];
  return [game.steps[0].candidates_before, ...game.steps.map((s) => s.candidates_after)];
}

/** Where a word is in the Answer List (`answers`, sorted): its row and column in the grid, or -1 when it is not on it. */
export function answerIndex(answers: readonly string[], word: string): number {
  let lo = 0;
  let hi = answers.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (answers[mid] === word) return mid;
    if (answers[mid] < word) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

/**
 * Each Guess's row in the grid, in the Game's order: its index in the Answer List, or null for a Guess off the Answer
 * List (a Guess List Guess), which has no row in the Answer × Answer matrix.
 */
export function guessRows(game: GameSteps, answers: readonly string[]): (number | null)[] {
  return game.steps.map((s) => {
    const row = answerIndex(answers, s.guess);
    return row < 0 ? null : row;
  });
}

/**
 * The dimmed columns at a step: 1 for each column whose Answer is not in `candidates` (the Candidate Set at that step),
 * 0 for each still lit. `null` candidates (step 0, before any Guess) dims nothing.
 */
export function dimmedMask(answers: readonly string[], candidates: readonly string[] | null): Uint8Array {
  const mask = new Uint8Array(answers.length);
  if (candidates === null) return mask;
  mask.fill(1);
  for (const word of candidates) {
    const col = answerIndex(answers, word);
    if (col >= 0) mask[col] = 0;
  }
  return mask;
}

/** How opaque the dimming veil is over a column no longer a Candidate: the column's colour still shows faintly. */
export const DIM_ALPHA = 0.82;

/**
 * Fill `out` (RGBA, one pixel per column, as a one-row `ImageData`'s `data`) with the dimming layer: the veil colour
 * at `alpha` over each dimmed column, clear over each lit one. The page draws this row stretched over the whole grid.
 */
export function fillDimRow(mask: Uint8Array, veil: Rgb, out: Uint8ClampedArray, alpha: number = DIM_ALPHA): void {
  if (out.length !== mask.length * 4) throw new Error(`the row has ${out.length / 4} pixels for ${mask.length} columns`);
  const a = Math.round(alpha * 255);
  for (let i = 0; i < mask.length; i++) {
    const on = mask[i] === 1;
    out[i * 4] = veil[0];
    out[i * 4 + 1] = veil[1];
    out[i * 4 + 2] = veil[2];
    out[i * 4 + 3] = on ? a : 0;
  }
}
