"use client";

import { ArrowRight } from "lucide-react";
import type { SolveResponse, SplitGroup } from "@/lib/api";
import type { Language } from "@/lib/i18n/language";
import { pageText } from "@/lib/i18n/page-text";
import { chainNodes, columnCount } from "@/lib/widgets/split-groups";
import { HEAD, useHeadCard } from "./HeadCard";
import { SplitBlock, useColumns } from "./SplitBlock";

/** What a node adds around its words' grid: the arrow and its gap (24px), the button's padding (16px) and thick border (4px). */
const NODE_EXTRA = 24 + 16 + 4;

/** Wordle's six Guesses: a node past them is a Loss, bordered red, even when it wins. */
const MAX_GUESSES = 6;

/**
 * The whole Game as a chain: the Answer List on its own line, then the Guesses flowing left to right and wrapping (one
 * column on a phone), each an arrow and a node, the Answer's group after that Guess drawn as a `SplitBlock` as in the
 * Full split (the Guess in that Feedback's Marks, the word count, every word in about √n columns, so a block is about
 * square, never more columns than fit), ending in the Win block. A node is a button that calls `onPick` with the Guess's
 * number; the current one is `aria-current="step"`. `groups[k]` is the Answer's group after Guess k+1, undefined while
 * its split loads. A node's head opens the shared stats card (see `useHeadCard`) on hover, and on keyboard focus of its
 * button (the head is not focusable itself, being inside the button); the card ignores the pointer, so a click always reaches the node.
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
  const card = useHeadCard({
    text,
    resetKey: groups,
    focusTarget: (el) => (el.tagName === "BUTTON" ? el.querySelector<HTMLElement>(HEAD) : null),
  });
  const { onPointerOver, onPointerOut, onFocus, onBlur } = card.handlers;
  const [ref, available] = useColumns(NODE_EXTRA);
  return (
    <div ref={ref} className="min-w-0">
      <ol
        aria-label={text.pathLabel(data.answer)}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
        onFocus={onFocus}
        onBlur={onBlur}
        className="flex flex-col items-center gap-2 font-sans sm:flex-row sm:flex-wrap sm:items-start sm:gap-x-2 sm:gap-y-4"
      >
        <li className="sm:basis-full">
          <span className="block w-fit rounded-sm border border-rule px-3 py-2 text-sm text-meta">{text.pathStart(data.steps[0].candidates_before)}</span>
        </li>
        {chainNodes(data, groups, Infinity).map((node) => {
          const current = node.number === step;
          return (
            <li key={node.number} className="flex max-w-full min-w-0 flex-col items-center gap-2 sm:flex-row sm:items-start">
              <ArrowRight className="size-4 shrink-0 rotate-90 text-meta sm:mt-3 sm:rotate-0" aria-hidden />
              <button
                type="button"
                aria-current={current ? "step" : undefined}
                aria-label={node.win ? text.pathWin(node.number, node.guess) : text.pathNode(node.number, node.guess, node.count)}
                onClick={() => onPick(node.number)}
                className={`w-fit max-w-full min-w-0 cursor-pointer rounded-md border p-2 text-left hover:bg-highlight-low ${
                  node.number > MAX_GUESSES ? "border-2 border-error" : node.win ? "border-accent" : "border-rule"
                } ${current ? "bg-highlight-med outline-2 outline-offset-0 outline-accent" : ""}`}
              >
                <span aria-hidden className="block">
                  <span className="mb-1 block text-[11px] font-medium tracking-wider text-meta uppercase">
                    {text.pathGuess(node.number)}
                  </span>
                  <SplitBlock
                    marks={node.marks}
                    count={node.count}
                    words={node.words}
                    more={node.more}
                    guess={node.guess}
                    columns={columnCount(node.words.length, available)}
                    text={text}
                    label={node.win ? text.winLabel : undefined}
                    highlightWord={data.answer}
                    total={node.total}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {card.node}
    </div>
  );
}
