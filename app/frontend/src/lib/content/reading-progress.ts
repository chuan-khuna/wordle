/** How far below the top of the window a heading counts as reached, so the section being read is the current one. */
export const REACHED = 0.25;

/** Where the reader is in an Article: the index of the section being read (null above the first heading), and how much of each section is read, 0 to 1. */
export type ReadingState = { current: number | null; progress: number[] };

/**
 * The reading state from where the headings are on screen. Pure. `tops` are the headings' tops and `end` the
 * bottom of the Article body, in window coordinates; `line` is the reading line (a quarter of the way down the
 * window). A section runs from its heading to the next heading (of any depth) or to `end`, and is read as far as
 * the line has passed into it. `atBottom` (the page cannot scroll further) counts every section as read, since
 * the line may never reach the last ones.
 */
export function readingState(tops: number[], end: number, line: number, atBottom: boolean): ReadingState {
  if (tops.length === 0) return { current: null, progress: [] };
  if (atBottom) return { current: tops.length - 1, progress: tops.map(() => 1) };
  const progress = tops.map((top, i) => {
    const length = (tops[i + 1] ?? end) - top;
    return length <= 0 ? (line >= top ? 1 : 0) : Math.min(1, Math.max(0, (line - top) / length));
  });
  let current: number | null = null;
  tops.forEach((top, i) => {
    if (top <= line) current = i;
  });
  return { current, progress };
}
