/** Games each Opener plays: the whole Answer List, so an Average Guess Count is a whole number over this. */
export const ANSWER_COUNT = 2315;

/**
 * The bar of an Average Guess Count: its hundredths, rounded half-up. Done on the exact integer Guess Count total
 * (the average times 2315, recovered by rounding away the float error), so a value on a .xx5 edge cannot fall into the wrong bar.
 * floor(100 * total / 2315 + 1/2) written without division.
 */
export function barOf(average: number): number {
  const total = Math.round(average * ANSWER_COUNT);
  return Math.floor((200 * total + ANSWER_COUNT) / (2 * ANSWER_COUNT));
}

export interface Bar<T> {
  /** The bar's Average Guess Count in hundredths, e.g. 353 for 3.53. */
  hundredths: number;
  /** Rank order, bottom of the stack first. */
  openers: T[];
}

/**
 * Group Openers into bars 0.01 wide. Each bar stacks its Openers in rank order; the bars run in order from the first
 * occupied to the last, with the empty ones between kept (empty list when there are no Openers).
 */
export function groupOpeners<T extends { rank: number; average_guess_count: number }>(openers: readonly T[]): Bar<T>[] {
  if (openers.length === 0) return [];
  const byBar = new Map<number, T[]>();
  for (const opener of openers) {
    const bar = barOf(opener.average_guess_count);
    const stack = byBar.get(bar);
    if (stack) stack.push(opener);
    else byBar.set(bar, [opener]);
  }
  const hundredths = [...byBar.keys()];
  const first = Math.min(...hundredths);
  const last = Math.max(...hundredths);
  return Array.from({ length: last - first + 1 }, (_, i) => ({
    hundredths: first + i,
    openers: (byBar.get(first + i) ?? []).sort((a, b) => a.rank - b.rank),
  }));
}

/** The Openers to chart: every one, or only those on the Answer List. */
export function filterOpeners<T extends { is_answer: boolean }>(openers: readonly T[], answersOnly: boolean): T[] {
  return answersOnly ? openers.filter((o) => o.is_answer) : [...openers];
}

/**
 * Rows for labels along a line, so none overlaps: each x (sorted ascending or not) gets the lowest row whose
 * last label is at least `gap` away. Returns one row per input x, in input order.
 */
export function labelRows(xs: readonly number[], gap: number): number[] {
  const order = xs.map((x, i) => i).sort((a, b) => xs[a] - xs[b]);
  const lastX: number[] = [];
  const rows = new Array<number>(xs.length).fill(0);
  for (const i of order) {
    let row = lastX.findIndex((last) => xs[i] - last >= gap);
    if (row < 0) row = lastX.length;
    lastX[row] = xs[i];
    rows[i] = row;
  }
  return rows;
}
