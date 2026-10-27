"use client";

import type { pageText } from "@/lib/i18n/page-text";
import { percent } from "@/lib/widgets/split-chart";
import { headStats } from "@/lib/widgets/split-groups";
import { parseMarks } from "@/lib/wordle/feedback";
import { Tile } from "./Tile";
import { useHoverCard } from "./useHoverCard";

/** Marks a block's head (set by `SplitBlock` when it is given the size of the Candidate Set) and what the card reads off it. */
export const HEAD = "[data-head]";

/** "7.57 bits" for a finite information, a dash for an empty group. */
const bitsText = (bits: number, unit: string) => (Number.isFinite(bits) ? `${bits.toFixed(2)} ${unit}` : "–");

/** The stats of the head element `el` (its `data-*`): the Feedback code and Guess, and the group's size over the Candidate Set's. */
function statsOf(el: HTMLElement) {
  const count = Number(el.dataset.count);
  const total = Number(el.dataset.total);
  return { code: el.dataset.head ?? "", guess: el.dataset.guess ?? "", count, total, stats: headStats(count, total) };
}

/** The accessible name of a head with stats: "Feedback 00102, 12 words, Chance 0.5%, Information 7.6 bits". */
export function headLabel(text: ReturnType<typeof pageText>, code: string, count: number, total: number): string {
  return `${text.feedbackLabel} ${code}, ${text.words(count)}, ${text.headChance} ${percent(count, total)}, ${text.headInformation} ${bitsText(headStats(count, total).bits, text.bits)}`;
}

/**
 * The one shared stats card of a split's block heads (see `useHoverCard`): the Feedback as small Tiles, then words, chance
 * (`count / total` as a percentage) and information (`-log2(chance)` in bits), formatted as the Feedback Split explorer's
 * chart is. It opens on a mouse resting on a head, on a tap and on keyboard focus (heads of `SplitGroups` are focusable;
 * `focusTarget` is for a head inside a button, as in the Follow an Answer path, where only the button is focusable), and is
 * `pointer-events-none`, so it never gets in the way of a click.
 */
export function useHeadCard({
  text,
  resetKey,
  focusTarget,
  onOpen,
  suppressed,
}: {
  text: ReturnType<typeof pageText>;
  resetKey: unknown;
  focusTarget?: (el: HTMLElement) => HTMLElement | null;
  onOpen?: () => void;
  suppressed?: boolean;
}) {
  return useHoverCard({
    selector: HEAD,
    resetKey,
    focusOpens: true,
    focusTarget,
    onOpen,
    suppressed,
    label: (el) => {
      const { code, count, total } = statsOf(el);
      return headLabel(text, code, count, total);
    },
    children: (el) => {
      const { code, guess, count, total, stats } = statsOf(el);
      const marks = parseMarks(code) ?? [];
      return (
        <dl className="grid grid-cols-[auto_auto] items-center gap-x-4 gap-y-1">
          <dt className="text-meta">{text.feedbackLabel}</dt>
          <dd className="flex gap-0.5 justify-self-end" aria-hidden="true">
            {Array.from(guess, (letter, i) => (
              <Tile key={i} tiny letter={letter} mark={marks[i] ?? 0} />
            ))}
          </dd>
          <dt className="text-meta">{text.headWords}</dt>
          <dd className="justify-self-end tabular-nums text-text">{stats.words}</dd>
          <dt className="text-meta">{text.headChance}</dt>
          <dd className="justify-self-end tabular-nums text-text">
            {count}/{total} · {percent(count, total)}
          </dd>
          <dt className="text-meta">{text.headInformation}</dt>
          <dd className="justify-self-end tabular-nums text-text">{bitsText(stats.bits, text.bits)}</dd>
        </dl>
      );
    },
  });
}
