"use client";

import { ArrowRight } from "lucide-react";
import type { SolveResponse, SplitGroup } from "@/lib/api";
import type { Language } from "@/lib/i18n/language";
import { pageText } from "@/lib/i18n/page-text";
import { chainNodes, columnCount } from "@/lib/widgets/split-groups";
import { SplitBlock } from "./SplitBlock";

/** The most word columns a node gets (a node of 40 words is 7 wide), so a node fits a phone. */
const NODE_COLUMNS = 7;

/**
 * The whole Game as a chain, left to right (top to bottom on a phone): the Answer List, then for each Guess an arrow and
 * a node, the Answer's group after that Guess drawn as a `SplitBlock` as in the Rows view (the Guess in that Feedback's
 * Marks, the word count, the words), ending in the Win block. A node is a button that calls `onPick` with the Guess's
 * number; the current one is `aria-current="step"`. `groups[k]` is the Answer's group after Guess k+1, undefined while
 * its split loads.
 */
export function FollowPath({
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
    <ol aria-label={text.pathLabel(data.answer)} className="flex flex-col items-center gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:gap-y-4">
      <li className="rounded-sm border border-rule px-3 py-2 text-sm text-meta sm:mt-2">{text.pathStart(data.steps[0].candidates_before)}</li>
      {chainNodes(data, groups).map((node) => {
        const current = node.number === step;
        return (
          <li key={node.number} className="flex flex-col items-center gap-2 sm:flex-row sm:items-start">
            <ArrowRight className="size-4 rotate-90 text-meta sm:mt-3 sm:rotate-0" aria-hidden />
            <button
              type="button"
              aria-current={current ? "step" : undefined}
              aria-label={node.win ? text.pathWin(node.number, node.guess) : text.pathNode(node.number, node.guess, node.count)}
              onClick={() => onPick(node.number)}
              className={`max-w-full cursor-pointer rounded-md border p-1.5 text-left hover:bg-highlight-low ${node.win ? "border-accent" : "border-rule"} ${current ? "bg-highlight-med outline-2 outline-offset-0 outline-accent" : ""}`}
            >
              <span aria-hidden className="block">
                <span className="mb-1 block text-[11px] font-medium tracking-wider text-meta uppercase">{text.pathGuess(node.number)}</span>
                <SplitBlock
                  marks={node.marks}
                  count={node.count}
                  words={node.words}
                  more={node.more}
                  guess={node.guess}
                  columns={columnCount(node.words.length, NODE_COLUMNS)}
                  text={text}
                  label={node.win ? text.winLabel : undefined}
                  highlightWord={data.answer}
                />
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
