import type { SolveResponse, SplitGroup, SplitResponse } from "@/lib/api";
import { orderGroups } from "@/lib/widgets/split-chart";

/** How big a block's head Tiles are drawn, from the largest to the smallest. */
export type HeadSize = "lg" | "md" | "sm" | "xs";

/** The groups biggest first (ties by lower Feedback Code), each with its words in alphabetical order. */
export function orderSplitGroups(groups: readonly SplitGroup[]): SplitGroup[] {
  return orderGroups(groups).map((g) => ({ ...g, words: [...g.words].sort() }));
}

/** How many columns a block of `count` words gets: about the square root, at least 1, never more than `available`. */
export function columnCount(count: number, available: number): number {
  return Math.max(1, Math.min(Math.ceil(Math.sqrt(count)), Math.floor(available)));
}

/** The size of a block's head Tiles: smaller for a smaller group, as in the video. */
export function headSize(count: number): HeadSize {
  if (count >= 100) return "lg";
  if (count >= 25) return "md";
  if (count >= 5) return "sm";
  return "xs";
}

/** How many groups hold a single word (the Feedbacks that name the Answer outright). */
export function singleWordGroups(groups: readonly Pick<SplitGroup, "count">[]): number {
  return groups.filter((g) => g.count === 1).length;
}

/** The State before each row of a Game: row k holds the Guesses before Guess k, as the API's `state` (Feedback as digit strings). */
export function statesPerRow(solve: Pick<SolveResponse, "steps">): { guess: string; feedback: string }[][] {
  return solve.steps.map((_, k) => solve.steps.slice(0, k).map((s) => ({ guess: s.guess, feedback: s.marks })));
}

/** The group of a row's split that holds `answer`, or undefined when no group does. */
export function answerGroup(split: Pick<SplitResponse, "split">, answer: string): SplitGroup | undefined {
  return split.split.find((g) => g.words.includes(answer));
}
