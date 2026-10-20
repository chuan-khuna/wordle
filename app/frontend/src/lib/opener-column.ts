import type { Bar } from "@/lib/opener-bars";

/** "3.43 · 412 Openers": a bar's Average Guess Count and how many Openers it holds. */
export function columnHeading(hundredths: number, count: number): string {
  return `${(hundredths / 100).toFixed(2)} · ${count.toLocaleString("en-US")} ${count === 1 ? "Opener" : "Openers"}`;
}

export interface BarColumn<T> {
  hundredths: number;
  count: number;
  heading: string;
  /** The bar's Openers in stack order, best first, each flagged when its word is highlighted. */
  rows: (T & { marked: boolean })[];
}

/** The side column for the bar at `hundredths`, or null when the chart has no such bar. */
export function barColumn<T extends { word: string }>(
  bars: readonly Bar<T>[],
  hundredths: number,
  marked: ReadonlySet<string>,
): BarColumn<T> | null {
  const bar = bars.find((b) => b.hundredths === hundredths);
  if (!bar) return null;
  return {
    hundredths,
    count: bar.openers.length,
    heading: columnHeading(hundredths, bar.openers.length),
    rows: bar.openers.map((o) => ({ ...o, marked: marked.has(o.word) })),
  };
}

/** The highlight field with `word` added at the end (unchanged when it is already listed). */
export function addWord(text: string, word: string): string {
  const listed = text.toLowerCase().split(/[\s,]+/);
  if (listed.includes(word)) return text;
  const kept = text.replace(/[\s,]+$/, "");
  return kept ? `${kept}, ${word}` : word;
}
