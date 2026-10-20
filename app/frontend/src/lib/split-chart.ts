import type { SplitGroup } from "@/lib/api";

/** Groups biggest first; ties go to the lower Feedback Code first, as in the gpui app. */
export function orderGroups<T extends Pick<SplitGroup, "count" | "code">>(groups: readonly T[]): T[] {
  return [...groups].sort((a, b) => b.count - a.count || a.code - b.code);
}

/** The chance of a Feedback: the group's size over the Candidate Set's size, as "30.6%" ("0%" for an empty set). */
export function percent(count: number, candidates: number): string {
  if (candidates <= 0) return "0%";
  const p = (count / candidates) * 100;
  // Two decimals below 0.1% so a rare Feedback does not read as "0.0%".
  return `${p === 100 ? "100" : p < 0.1 && p > 0 ? p.toFixed(2) : p.toFixed(1)}%`;
}

export const wordsText = (count: number) => `${count} word${count === 1 ? "" : "s"}`;

/** The full sentence for a bar: "30.6% chance of this Feedback, leaving 15 words". */
export function chanceSentence(count: number, candidates: number): string {
  return `${percent(count, candidates)} chance of this Feedback, leaving ${wordsText(count)}`;
}

/** Bar length as a percentage of the largest group (at least a sliver so a one-word group shows). */
export function barPercent(count: number, largest: number): number {
  if (largest <= 0) return 0;
  return Math.max((count / largest) * 100, 0.8);
}

/** Expected words left as the gpui app shows it: one decimal below 10, none from 10. */
export function formatLeft(left: number): string {
  return left < 10 ? left.toFixed(1) : left.toFixed(0);
}

/** The chart's title: "Expected 31 words left · 4.12 bits"; the bits are left out when `bits` is false. */
export function chartTitle(expectedCandidates: number, bitsValue: number, showBits: boolean): string {
  const left = `Expected ${formatLeft(expectedCandidates)} words left`;
  return showBits ? `${left} · ${bitsValue.toFixed(2)} bits` : left;
}
