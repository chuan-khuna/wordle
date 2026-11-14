/**
 * The Feedback Matrix page's grid, as pure functions: the colour scale a Feedback Code is drawn in, and the
 * one-pixel-per-cell image the canvas scales up, the viewport (zoom and centre) with its pixel ↔ cell maths, the a–z
 * ticks, and the Game on the grid. The page draws the Answer × Answer Feedback Matrix, row by row: rows Guesses,
 * columns Answers, both in Answer List order.
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

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

/**
 * What part of the grid the square frame shows: `zoom`, how many times the fitted size the grid is drawn (1 fits the
 * whole grid in the frame, and is the least), and the grid point at the frame's centre, `x` across the columns and `y`
 * down the rows, as fractions of the grid's side (0 to 1).
 */
export type Viewport = { zoom: number; x: number; y: number };

/** The whole grid in the frame. */
export const FIT: Viewport = { zoom: 1, x: 0.5, y: 0.5 };

/** How big a cell may grow, in CSS pixels: the most zoom is where a cell is this wide. */
export const MAX_CELL_PX = 40;

/** The most zoom for a grid of `side` × `side` cells fitted to a frame `fit` CSS pixels a side: a cell `MAX_CELL_PX` wide (never under 1). */
export function maxZoom(fit: number, side: number): number {
  if (!(fit > 0) || side <= 0) return 1;
  return Math.max(1, (MAX_CELL_PX * side) / fit);
}

/**
 * A viewport the frame can show: the zoom between 1 (fit) and `max`, and the centre kept far enough in that the frame
 * never shows past the grid's edges (at fit, the grid's middle). A value that is not a number reads as fit's.
 */
export function clampViewport(view: Viewport, max: number): Viewport {
  const zoom = clamp(Number.isFinite(view.zoom) ? view.zoom : 1, 1, Math.max(1, max));
  const half = 0.5 / zoom;
  const at = (v: number) => clamp(Number.isFinite(v) ? v : 0.5, half, 1 - half);
  return { zoom, x: at(view.x), y: at(view.y) };
}

/** Where the grid is drawn in a square frame `fit` CSS pixels a side: its top-left corner, from the frame's, and its side. */
export function gridBox(view: Viewport, fit: number): { left: number; top: number; size: number } {
  const size = fit * view.zoom;
  return { left: fit / 2 - view.x * size, top: fit / 2 - view.y * size, size };
}

/**
 * Zoom by `factor` (above 1 in, below 1 out) around the point (`px`, `py`) of the frame, in CSS pixels from its top-left
 * corner: the grid point under it stays under it, unless that would show past the grid's edges (`clampViewport`).
 */
export function zoomAround(view: Viewport, factor: number, px: number, py: number, fit: number, max: number): Viewport {
  if (!(fit > 0)) return view;
  const before = gridBox(view, fit);
  const gx = (px - before.left) / before.size;
  const gy = (py - before.top) / before.size;
  const zoom = clamp(view.zoom * factor, 1, Math.max(1, max));
  const size = fit * zoom;
  return clampViewport({ zoom, x: gx + (fit / 2 - px) / size, y: gy + (fit / 2 - py) / size }, max);
}

/** Drag the grid by (`dx`, `dy`) CSS pixels (right and down positive), clamped to the grid's edges. */
export function panBy(view: Viewport, dx: number, dy: number, fit: number, max: number): Viewport {
  if (!(fit > 0)) return view;
  const size = fit * view.zoom;
  return clampViewport({ zoom: view.zoom, x: view.x - dx / size, y: view.y - dy / size }, max);
}

/** A cell of the grid: its row (the Guess) and its column (the Answer), both indices into the Answer List. */
export type Cell = { row: number; col: number };

/**
 * The cell under the point (`px`, `py`) of the frame, in CSS pixels from its top-left corner, when the grid of
 * `side` × `side` cells is drawn at `view` in a frame `fit` pixels a side; null outside the frame or off the grid. A cell
 * covers [start, end) on each axis, so a point on the line between two cells is in the later one.
 */
export function cellAt(px: number, py: number, view: Viewport, fit: number, side: number): Cell | null {
  if (side <= 0 || !(fit > 0) || !(px >= 0 && py >= 0 && px < fit && py < fit)) return null;
  const { left, top, size } = gridBox(view, fit);
  const x = px - left;
  const y = py - top;
  if (!(x >= 0 && y >= 0 && x < size && y < size)) return null;
  const index = (p: number) => Math.min(side - 1, Math.floor((p * side) / size));
  return { row: index(y), col: index(x) };
}

/** Where a cell is drawn: its top-left corner and side in CSS pixels from the frame's top-left corner, as for `cellAt`. */
export function cellRect(cell: Cell, view: Viewport, fit: number, side: number): { x: number; y: number; size: number } {
  const { left, top, size } = gridBox(view, fit);
  const step = size / side;
  return { x: left + cell.col * step, y: top + cell.row * step, size: step };
}

/**
 * The cells any part of which is in the frame: columns [`col0`, `col1`) and rows [`row0`, `row1`). The canvas draws only
 * these from the one-pixel-per-cell image, so a deep zoom never draws a grid tens of thousands of pixels wide.
 */
export function visibleCells(view: Viewport, fit: number, side: number): { col0: number; col1: number; row0: number; row1: number } {
  const { left, top, size } = gridBox(view, fit);
  if (!(size > 0) || side <= 0) return { col0: 0, col1: 0, row0: 0, row1: 0 };
  const first = (offset: number) => clamp(Math.floor((-offset * side) / size), 0, side);
  const end = (offset: number) => clamp(Math.ceil(((fit - offset) * side) / size), 0, side);
  return { col0: first(left), col1: end(left), row0: first(top), row1: end(top) };
}

/** The URL params' values at fit, left out of the URL: `zoom` 1 and `centre` the grid's middle. */
export const ZOOM_PARAM_DEFAULT = "1";
export const CENTRE_PARAM_DEFAULT = "0.5,0.5";

/**
 * A viewport from the `zoom` and `centre` URL params: `zoom` a number, 1 or more (1 is fit; the old stepped values
 * `fit`, `2`, `4` and `8` read as 1, 2, 4 and 8), `centre` two fractions "x,y". Anything else reads as fit's. Not
 * clamped: the most zoom depends on the frame.
 */
export function parseViewport(zoom: string | null | undefined, centre: string | null | undefined): Viewport {
  const z = zoom === "fit" ? 1 : Number(zoom ?? "");
  const parts = (centre ?? "").split(",").map((p) => (p.trim() === "" ? Number.NaN : Number(p)));
  const ok = parts.length === 2 && parts.every((v) => Number.isFinite(v) && v >= 0 && v <= 1);
  return { zoom: Number.isFinite(z) && z >= 1 ? z : 1, x: ok ? parts[0] : 0.5, y: ok ? parts[1] : 0.5 };
}

/** A viewport as the `zoom` (two decimals) and `centre` (five, a fraction of a cell at the most zoom) URL params. */
export function viewportParams(view: Viewport): { zoom: string; centre: string } {
  const round = (v: number, places: number) => String(Number(v.toFixed(places)));
  return { zoom: round(view.zoom, 2), centre: `${round(view.x, 5)},${round(view.y, 5)}` };
}

/** The words of one first letter in the Answer List (sorted): indices [`start`, `end`). */
export type LetterSpan = { letter: string; start: number; end: number };

/** The Answer List's first letters, in order, each with its span; a letter no Answer starts with (x) has none. */
export function letterSpans(answers: readonly string[]): LetterSpan[] {
  const spans: LetterSpan[] = [];
  answers.forEach((word, i) => {
    const last = spans[spans.length - 1];
    if (last && last.letter === word[0]) last.end = i + 1;
    else spans.push({ letter: word[0], start: i, end: i + 1 });
  });
  return spans;
}

/**
 * A tick on an axis: `at`, where its letter's first word starts (null when that is outside the frame but some of the
 * letter's words are in it), and `label`, where its letter is written (null when the label is dropped), both in CSS
 * pixels along the axis from the frame's edge.
 */
export type Tick = { letter: string; at: number | null; label: number | null };

/**
 * The ticks on one axis `length` CSS pixels long, with the grid drawn from `offset` at side `size` (`gridBox`'s left or
 * top, and size) over `side` cells. A letter shows when any of its words is in view. Its label is centred on the part
 * of its span in view (kept `gap` / 2 from the axis's ends), and a label closer than `gap` to one already placed is
 * dropped, the letters with the most of their span in view placed first; every tick line stays.
 */
export function axisTicks(spans: readonly LetterSpan[], offset: number, size: number, side: number, length: number, gap: number): Tick[] {
  if (side <= 0 || !(size > 0)) return [];
  const px = (index: number) => offset + (index * size) / side;
  const shown = spans.flatMap((span) => {
    const a = px(span.start);
    const b = px(span.end);
    if (b <= 0 || a >= length) return [];
    const lo = Math.max(a, 0);
    const hi = Math.min(b, length);
    const centre = length >= gap ? clamp((lo + hi) / 2, gap / 2, length - gap / 2) : length / 2;
    return [{ letter: span.letter, at: a >= 0 ? a : null, centre, width: hi - lo }];
  });
  const placed: number[] = [];
  const keep = new Set<string>();
  for (const t of [...shown].sort((p, q) => q.width - p.width)) {
    if (placed.every((c) => Math.abs(c - t.centre) >= gap)) {
      placed.push(t.centre);
      keep.add(t.letter);
    }
  }
  return shown.map((t) => ({ letter: t.letter, at: t.at, label: keep.has(t.letter) ? t.centre : null }));
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
 * `mask` may also hold levels between 0 and 1 (`mixLevels`, mid-fade): a column at level l is veiled at l × `alpha`.
 */
export function fillDimRow(mask: ArrayLike<number>, veil: Rgb, out: Uint8ClampedArray, alpha: number = DIM_ALPHA): void {
  if (out.length !== mask.length * 4) throw new Error(`the row has ${out.length / 4} pixels for ${mask.length} columns`);
  for (let i = 0; i < mask.length; i++) {
    out[i * 4] = veil[0];
    out[i * 4 + 1] = veil[1];
    out[i * 4 + 2] = veil[2];
    out[i * 4 + 3] = Math.round(Math.min(1, Math.max(0, mask[i])) * alpha * 255);
  }
}

/** The Candidate view's theme roles: a Candidate's column, and a column no longer a Candidate. */
export const CANDIDATE_ROLES = ["--candidate", "--muted"] as const;

/**
 * Fill `out` (RGBA, one pixel per column, as a one-row `ImageData`'s `data`) with the Candidate view: each column in
 * `lit` (a Candidate) at level 0, in `gone` (no longer one) at level 1, mixed between mid-fade. Every pixel is opaque,
 * so the page draws this row stretched over the whole grid in place of the Feedback colours.
 */
export function fillCandidateRow(levels: ArrayLike<number>, lit: Rgb, gone: Rgb, out: Uint8ClampedArray): void {
  if (out.length !== levels.length * 4) throw new Error(`the row has ${out.length / 4} pixels for ${levels.length} columns`);
  for (let i = 0; i < levels.length; i++) {
    const t = Math.min(1, Math.max(0, levels[i]));
    for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.round(lit[c] + (gone[c] - lit[c]) * t);
    out[i * 4 + 3] = 255;
  }
}

/**
 * How dimmed each column is, for a fade: 0 lit, 1 fully dimmed, between while the column fades. Write into `out` the
 * levels a fraction `t` (0 to 1) of the way from `from` (the levels shown when the fade began) to `to` (the step's
 * mask), so a fade that starts mid-fade carries on from what is on the screen.
 */
export function mixLevels(from: ArrayLike<number>, to: ArrayLike<number>, t: number, out: Float32Array): void {
  if (from.length !== out.length || to.length !== out.length) throw new Error(`mixing ${from.length} and ${to.length} levels into ${out.length}`);
  const k = Math.min(1, Math.max(0, t));
  for (let i = 0; i < out.length; i++) out[i] = from[i] + (to[i] - from[i]) * k;
}

/** How long Play holds each step, from one step to the next, in milliseconds. */
export const PLAY_STEP_MS = 1800;
/** How long the dimmed columns take to fade between two steps, in milliseconds; well inside `PLAY_STEP_MS`. */
export const FADE_MS = 600;

/** How far a fade is (0 to 1, eased in and out so it starts and ends gently) `elapsed` ms into one of `duration` ms. */
export function fadeProgress(elapsed: number, duration: number = FADE_MS): number {
  if (!(duration > 0)) return 1;
  const t = Math.min(1, Math.max(0, elapsed / duration));
  return t * t * (3 - 2 * t);
}

/** The step Play starts from: the current one, or step 0 when the Game is already at its Win (its last step, `total`). */
export function playStart(step: number, total: number): number {
  return step >= total ? 0 : step;
}

/** The step Play shows next after `step`, or null when `step` is the Win (`total`) and Play stops. */
export function playNext(step: number, total: number): number | null {
  return step >= total ? null : step + 1;
}
