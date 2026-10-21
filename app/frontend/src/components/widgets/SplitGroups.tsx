"use client";

import Link from "next/link";
import { Popover } from "radix-ui";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { SplitResponse } from "@/lib/api";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";
import { pageText } from "@/lib/i18n/page-text";
import { parseMarks } from "@/lib/wordle/feedback";
import { type HeadSize, columnCount, headSize, orderSplitGroups } from "@/lib/widgets/split-groups";
import { Tile } from "./Tile";

/** A word is five mono capitals at 11px (about 6.6px each), in a grid column of `WORD_W` pixels; columns are `WORD_GAP` apart. */
const WORD_W = 38;
const WORD_GAP = 8;
/** What a block adds around its grid: 6px of padding each side, plus 3px each side for the highlight outline. */
const BLOCK_EXTRA = 2 * 6 + 2 * 3;
/** Columns assumed until the container has been measured. */
const FALLBACK_COLUMNS = 12;

const HEAD_TILE: Record<HeadSize, { small?: boolean; board?: boolean; tiny?: boolean }> = {
  lg: {},
  md: { small: true },
  sm: { board: true },
  xs: { tiny: true },
};

const columnsIn = (width: number) => Math.max(1, Math.floor((width - BLOCK_EXTRA + WORD_GAP) / (WORD_W + WORD_GAP)));

/** How many word columns fit in the container's width, or in `layoutWidth` when given (at least 1), kept up to date as it resizes. */
function useColumns(layoutWidth?: number): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(FALLBACK_COLUMNS);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || layoutWidth !== undefined) return;
    const measure = () => setColumns(columnsIn(el.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [layoutWidth]);
  return [ref, layoutWidth === undefined ? columns : columnsIn(layoutWidth)];
}

// Hover delays, as the glossary cards have: open after a short rest on a word, close a little after the pointer leaves it and its card.
const OPEN_DELAY = 150;
const CLOSE_DELAY = 250;

type OrderedGroup = ReturnType<typeof orderSplitGroups>[number];
type Opener = "hover" | "key" | "tap";

/** The word button under an event target, if any (words are found by delegation, not by a handler each). */
const wordOf = (target: EventTarget | null) => (target as HTMLElement | null)?.closest?.<HTMLElement>("[data-word]") ?? null;

/**
 * The Feedback Split of one Guess over a Candidate Set with every word shown, as in the video: one block per
 * Feedback, biggest first, flowing left to right and wrapping. A block's head is the Guess with that Feedback's five
 * Marks (smaller Tiles for a smaller group) and the group's word count; under it the group's words, alphabetical, as
 * plain text (no Tiles, no Mark colours), in about √n columns (never more than fit). A word is one text element, so the ~2,315 words
 * of a whole Answer List stay light.
 * `highlightCode` outlines one group and `highlightWord` draws one word as strong text.
 * With `wordLink` every word is a button: hovering it (mouse), tapping it, or Enter on it shows one shared card (a Radix
 * Popover anchored to that word) with the word and a link to `wordLink(word)`. The picked word stays strong until another
 * is picked. The words are one tab stop with arrow-key roving focus; the handlers are on the root, not on each word.
 */
export const SplitGroups = memo(function SplitGroups({
  split,
  lang = DEFAULT_LANGUAGE,
  highlightCode,
  highlightWord,
  layoutWidth,
  wordLink,
}: {
  split: SplitResponse;
  lang?: Language;
  highlightCode?: number;
  highlightWord?: string;
  /** Lay the blocks out as if the container were this wide (in pixels), instead of measuring it (the Opener Split's fit mode). */
  layoutWidth?: number;
  /** Turns a word into a link (the Opener Split page): where its card's "Follow this Answer" goes. Without it words are plain text. */
  wordLink?: (word: string) => string;
}) {
  const text = pageText(lang);
  const groups = useMemo(() => orderSplitGroups(split.split), [split.split]);
  const [ref, available] = useColumns(layoutWidth);
  const guess = split.word;
  const linked = wordLink !== undefined;

  // The roving tab stop (the last focused word; the first word until then) and the picked word (the one whose card opened last).
  const [focused, setFocused] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  // The word whose card is open, and its element: the card's anchor.
  const [shown, setActive] = useState<{ word: string; el: HTMLElement; split: SplitResponse } | null>(null);
  // A new split replaces the word elements, so a card opened on the old one is closed.
  const active = shown?.split === split ? shown : null;
  const activeEl = active?.el ?? null;
  const anchor = useMemo(() => ({ current: activeEl }), [activeEl]);
  const lastEl = useRef<HTMLElement | null>(null);
  const how = useRef<Opener>("hover");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const card = useRef<HTMLDivElement>(null);
  // The last pointer gesture on a word: for a tap, whether its card was already open when it began.
  const gesture = useRef({ touch: false, wasOpen: false });

  const first = groups[0]?.words[0];
  const tabWord = focused !== null && groups.some((g) => g.words.includes(focused)) ? focused : first;

  useEffect(() => () => clearTimeout(timer.current), []);

  const show = (el: HTMLElement, by: Opener) => {
    clearTimeout(timer.current);
    how.current = by;
    lastEl.current = el;
    setActive((a) => (a?.el === el ? a : { word: el.dataset.word!, el, split }));
    setPicked(el.dataset.word!);
  };
  const hide = () => {
    clearTimeout(timer.current);
    setActive(null);
  };
  const hideLater = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(hide, CLOSE_DELAY);
  };
  const mouse = (e: React.PointerEvent) => e.pointerType === "mouse";

  /** Moves the focus along the words: by `step` words (across blocks), by `step` in a block's grid, or to a block's first word. */
  const roam = (el: HTMLElement, key: string): HTMLElement | null => {
    const all = () => [...(ref.current?.querySelectorAll<HTMLElement>("[data-word]") ?? [])];
    const list = el.closest("ul")!;
    const here = [...list.querySelectorAll<HTMLElement>("[data-word]")];
    const at = here.indexOf(el);
    const cols = Number(list.dataset.cols) || 1;
    const block = el.closest("[data-marks]");
    switch (key) {
      case "ArrowRight":
      case "ArrowLeft": {
        const every = all();
        return every[every.indexOf(el) + (key === "ArrowRight" ? 1 : -1)] ?? null;
      }
      case "ArrowDown":
        return here[at + cols] ?? null;
      case "ArrowUp":
        return here[at - cols] ?? null;
      case "PageDown":
        return block?.nextElementSibling?.querySelector<HTMLElement>("[data-word]") ?? null;
      case "PageUp":
        return block?.previousElementSibling?.querySelector<HTMLElement>("[data-word]") ?? null;
      case "Home":
        return all()[0] ?? null;
      case "End":
        return all().at(-1) ?? null;
    }
    return null;
  };

  const handlers = linked
    ? {
        onPointerOver: (e: React.PointerEvent) => {
          const el = wordOf(e.target);
          if (!el || !mouse(e)) return;
          if (active?.el === el) return clearTimeout(timer.current);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => show(el, "hover"), OPEN_DELAY);
        },
        onPointerOut: (e: React.PointerEvent) => {
          const el = wordOf(e.target);
          if (el && mouse(e) && el !== wordOf(e.relatedTarget)) hideLater();
        },
        onPointerDown: (e: React.PointerEvent) => {
          const el = wordOf(e.target);
          if (el) gesture.current = { touch: !mouse(e), wasOpen: active?.el === el };
        },
        onClick: (e: React.MouseEvent) => {
          const el = wordOf(e.target);
          if (!el) return;
          if (e.detail === 0) {
            // Enter or Space: open with the focus in the card, so the link is a Tab (or Enter) away.
            show(el, "key");
            requestAnimationFrame(() => card.current?.querySelector<HTMLElement>("a")?.focus());
          } else if (gesture.current.touch && gesture.current.wasOpen) hide();
          else show(el, gesture.current.touch ? "tap" : "hover");
        },
        onFocus: (e: React.FocusEvent) => {
          const el = wordOf(e.target);
          if (el) setFocused(el.dataset.word!);
        },
        onKeyDown: (e: React.KeyboardEvent) => {
          const el = wordOf(e.target);
          if (!el || e.altKey || e.ctrlKey || e.metaKey) return;
          const next = roam(el, e.key);
          if (!next) return;
          e.preventDefault();
          next.focus();
        },
      }
    : {};

  return (
    <div ref={ref} className="min-w-0 font-sans" style={layoutWidth === undefined ? undefined : { width: layoutWidth }} {...handlers}>
      <ul aria-label={text.splitGroupsLabel(guess)} className="flex flex-wrap items-start gap-x-5 gap-y-6">
        {groups.map((g) => (
          <Block
            key={g.marks}
            group={g}
            guess={guess}
            columns={columnCount(g.count, available)}
            text={text}
            outlined={g.code === highlightCode}
            highlightWord={highlightWord}
            linked={linked}
            picked={picked !== null && g.words.includes(picked) ? picked : null}
            tabWord={tabWord !== undefined && g.words.includes(tabWord) ? tabWord : null}
          />
        ))}
      </ul>
      {wordLink && (
        <Popover.Root open={active !== null} onOpenChange={(open) => !open && hide()}>
          <Popover.Anchor virtualRef={anchor} />
          <Popover.Portal>
            <Popover.Content
              ref={card}
              side="top"
              sideOffset={4}
              collisionPadding={20}
              aria-label={active?.word}
              // Above the Full screen overlay (z-100).
              className="z-[110] w-fit rounded-sm border border-rule-strong bg-popover px-3 py-2 font-sans text-sm leading-snug font-normal text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0"
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => {
                e.preventDefault();
                // Back to the word after a keyboard open (Escape); a mouse or tap close leaves the focus alone.
                if (how.current === "key") lastEl.current?.focus();
              }}
              onPointerEnter={(e) => mouse(e) && clearTimeout(timer.current)}
              onPointerLeave={(e) => mouse(e) && hideLater()}
            >
              {active && (
                <>
                  <p className="font-mono text-base font-bold tracking-widest text-text uppercase">{active.word}</p>
                  <Link href={wordLink(active.word)} className="text-accent underline underline-offset-2">
                    {text.followThisAnswer}
                  </Link>
                </>
              )}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
    </div>
  );
});

/** One Feedback's block: its head (the Guess in that Feedback's Marks, the word count) and its words. Memoised, so picking a word redraws only its own block. */
const Block = memo(function Block({
  group: g,
  guess,
  columns,
  text,
  outlined,
  highlightWord,
  linked,
  picked,
  tabWord,
}: {
  group: OrderedGroup;
  guess: string;
  columns: number;
  text: ReturnType<typeof pageText>;
  outlined: boolean;
  highlightWord?: string;
  linked: boolean;
  /** The picked word, when it is in this block. */
  picked: string | null;
  /** The word that is the tab stop, when it is in this block. */
  tabWord: string | null;
}) {
  const marks = parseMarks(g.marks) ?? [];
  const size = HEAD_TILE[headSize(g.count)];
  return (
    <li
      data-marks={g.marks}
      aria-current={outlined ? "true" : undefined}
      className={`max-w-full rounded-md p-1.5 ${outlined ? "outline-2 outline-offset-1 outline-accent" : ""}`}
    >
      <div role="group" aria-label={`${text.feedbackLabel} ${g.marks}, ${text.words(g.count)}`}>
        <div className="flex gap-0.5" aria-hidden="true">
          {Array.from(guess, (letter, i) => (
            <Tile key={i} letter={letter} mark={marks[i] ?? 0} {...size} />
          ))}
        </div>
        <p className="mt-1 text-xs text-meta tabular-nums">{text.words(g.count)}</p>
      </div>
      <ul
        data-cols={columns}
        className="mt-2 grid"
        style={{ gridTemplateColumns: `repeat(${columns}, ${WORD_W}px)`, gap: WORD_GAP }}
      >
        {g.words.map((w) => (
          <li key={w}>
            <WordText word={w} strong={w === highlightWord || w === picked} linked={linked} tabbable={w === tabWord} />
          </li>
        ))}
      </ul>
    </li>
  );
});

/** One word as plain mono text (no Mark colours); `strong` is the highlighted word. Linked, it is a button (only the tab stop is in the Tab order). */
function WordText({ word, strong, linked, tabbable }: { word: string; strong: boolean; linked: boolean; tabbable: boolean }) {
  const look = `block font-mono text-[11px] leading-5 uppercase ${strong ? "font-bold text-text" : "text-meta"}`;
  if (!linked) return <span className={look}>{word}</span>;
  return (
    <button
      type="button"
      data-word={word}
      tabIndex={tabbable ? 0 : -1}
      aria-haspopup="dialog"
      className={`${look} w-full cursor-pointer rounded-xs text-left hover:text-text focus-visible:outline-2 focus-visible:outline-accent`}
    >
      {word}
    </button>
  );
}
