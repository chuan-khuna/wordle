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
