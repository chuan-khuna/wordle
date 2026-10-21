import type { SplitGroup } from "@/lib/api";
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
