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

/** What a block's head says about its Feedback: how many words it leaves, the chance of getting it, and the information it gives, in bits. */
export interface HeadStats {
  words: number;
  /** The group's size over the Candidate Set's size, 0 to 1 (0 for an empty set). */
  chance: number;
  /** -log2(chance): 0 for a group that is the whole set; `Infinity` for a group with no words or a set with none. */
  bits: number;
}

/** The stats of a group of `count` words in a Candidate Set of `total`: words, chance `count / total` and information `-log2(chance)`. */
export function headStats(count: number, total: number): HeadStats {
  const chance = total > 0 ? count / total : 0;
  // `+ 0` turns -0 (a chance of 1) into 0.
  return { words: count, chance, bits: chance > 0 ? -Math.log2(chance) + 0 : Infinity };
}

/** The State before each row of a Game: row k holds the Guesses before Guess k, as the API's `state` (Feedback as digit strings). */
export function statesPerRow(solve: Pick<SolveResponse, "steps">): { guess: string; feedback: string }[][] {
  return solve.steps.map((_, k) => solve.steps.slice(0, k).map((s) => ({ guess: s.guess, feedback: s.marks })));
}

/** The group of a row's split that holds `answer`, or undefined when no group does. */
export function answerGroup(split: Pick<SplitResponse, "split">, answer: string): SplitGroup | undefined {
  return split.split.find((g) => g.words.includes(answer));
}

/**
 * Which of two splits has the better value of each of the five figures, in the page's order (Groups, Largest group,
 * Single-word groups, Expected Information, Expected Candidates): `true` when `split` is better, `false` when it is
 * worse, `null` on a tie. Better is more groups, a smaller largest group, more single-word groups, more Expected
 * Information, fewer Expected Candidates.
 */
export function betterFigures(
  split: Pick<SplitResponse, "groups" | "largest_group" | "split" | "bits" | "expected_candidates">,
  other: Pick<SplitResponse, "groups" | "largest_group" | "split" | "bits" | "expected_candidates">,
): (boolean | null)[] {
  const verdict = (mine: number, theirs: number, higherIsBetter: boolean): boolean | null =>
    mine === theirs ? null : mine > theirs === higherIsBetter;
  return [
    verdict(split.groups, other.groups, true),
    verdict(split.largest_group, other.largest_group, false),
    verdict(singleWordGroups(split.split), singleWordGroups(other.split), true),
    verdict(split.bits, other.bits, true),
    verdict(split.expected_candidates, other.expected_candidates, false),
  ];
}

/** One node of the Follow an Answer path: the Answer's group after a Guess. `words` is what is drawn, `more` how many are left out. */
export interface ChainNode {
  number: number;
  guess: string;
  marks: string;
  count: number;
  /** The size of the Candidate Set before the Guess (the Candidate Set the split was over). */
  total: number;
  words: string[];
  more: number;
  /** The last node of a solved Game: just the Answer. */
  win: boolean;
}

/**
 * The nodes of the path, one per Guess. Node k holds the Answer's group after Guess k (`groups[k]`, `undefined` while its
 * split is loading, which gives no words). A group of more than `limit` words shows its first `limit` alphabetically, the
 * Answer kept among them, and counts the rest in `more`.
 */
export function chainNodes(solve: SolveResponse, groups: readonly (SplitGroup | undefined)[], limit = 40): ChainNode[] {
  return solve.steps.map((s, k) => {
    const win = solve.solved && k === solve.steps.length - 1;
    const all = win ? [solve.answer] : [...(groups[k]?.words ?? [])].sort();
    let words = all.slice(0, limit);
    if (all.length > limit && !words.includes(solve.answer) && all.includes(solve.answer)) words = [...words.slice(0, -1), solve.answer].sort();
    return { number: s.number, guess: s.guess, marks: s.marks, count: win ? 1 : s.candidates_after, total: s.candidates_before, words, more: all.length - words.length, win };
  });
}
