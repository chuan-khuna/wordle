"use client";

import { ArrowRight } from "lucide-react";
import type { SolveResponse, SplitGroup } from "@/lib/api";
import type { Language } from "@/lib/i18n/language";
import { pageText } from "@/lib/i18n/page-text";
import { chainNodes } from "@/lib/widgets/split-groups";
import { parseMarks } from "@/lib/wordle/feedback";
import { Tile } from "./Tile";

/** How wide a node may be: narrower for a smaller group, so the chain shrinks as the Answer is closed in on. */
const nodeWidth = (count: number): string => (count >= 100 ? "24rem" : count >= 25 ? "16rem" : count >= 5 ? "11rem" : "7rem");

/**
 * The whole Game as a chain, left to right (top to bottom on a phone): the Answer List, then for each Guess an arrow
 * labelled with the Guess and its Feedback Marks and the node it leaves, the Answer's group, ending in the Win. A node
 * and its arrow are buttons that call `onPick` with the Guess's number; the current one is `aria-current="step"`.
 * `groups[k]` is the Answer's group after Guess k+1, undefined while its split loads.
 */
export function FollowGraph({
  data,
  groups,
  step,
  onPick,
  lang,
}: {
  data: SolveResponse;
  groups: readonly (SplitGroup | undefined)[];
  step: number;
  onPick: (n: number) => void;
  lang: Language;
}) {
  const text = pageText(lang);
  return (
    <ol aria-label={text.graphLabel(data.answer)} className="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:gap-y-4">
      <li className="rounded-sm border border-rule px-3 py-2 text-sm text-meta sm:mt-2">{text.graphStart(data.steps[0].candidates_before)}</li>
      {chainNodes(data, groups).map((node) => {
        const current = node.number === step;
        const marks = parseMarks(node.marks);
        return (
          <li key={node.number} className="flex flex-col items-center gap-2 sm:flex-row">
            <button
              type="button"
              tabIndex={-1}
              aria-hidden
              onClick={() => onPick(node.number)}
              className="flex cursor-pointer flex-col items-center gap-1 rounded-xs p-1 hover:bg-highlight-low"
            >
              <span className="flex gap-0.5">
                {[...node.guess].map((l, i) => (
                  <Tile key={i} letter={l} mark={marks?.[i] ?? 0} tiny />
                ))}
              </span>
              <ArrowRight className="size-4 rotate-90 text-meta sm:rotate-0" aria-hidden />
            </button>
            <button
              type="button"
              aria-current={current ? "step" : undefined}
              aria-label={text.graphNode(node.number, node.guess, node.count)}
              onClick={() => onPick(node.number)}
              style={{ maxWidth: nodeWidth(node.count) }}
              className={`w-full cursor-pointer rounded-sm border p-2 text-left hover:bg-highlight-low sm:w-auto ${node.win ? "border-accent" : "border-rule"} ${current ? "bg-highlight-med outline-2 outline-offset-0 outline-accent" : ""}`}
            >
              <span aria-hidden className="block">
                <span className="mb-1 block text-xs text-meta">{text.words(node.count)}</span>
                <span className="flex flex-wrap gap-x-2">
                  {node.words.map((w) => (
                    <span key={w} className={`font-mono text-[11px] leading-5 uppercase ${w === data.answer ? "font-bold text-text" : "text-meta"}`}>
                      {w}
                    </span>
                  ))}
                  {node.more > 0 && <span className="text-[11px] leading-5 text-meta">{text.graphMore(node.more)}</span>}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
