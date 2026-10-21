"use client";

import { Info } from "lucide-react";
import { Popover, RadioGroup } from "radix-ui";
import { useEffect, useId, useRef, useState } from "react";
import type { Pool, Rank, Scope } from "@/lib/api";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";
import { pageText } from "@/lib/i18n/page-text";
import { POOL_NAMES, POOLS, RANKING_NAMES, RANKS, SCOPE_NAMES, SCOPES, strategyFor } from "@/lib/wordle/strategies";

export interface StrategyChoice {
  pool: Pool;
  scope: Scope;
  by: Rank;
}

/**
 * The three choices that make up a Strategy, each as a row of joined buttons (as in the gpui app's Solver panel):
 * Guess Pool, Search Scope and Ranking, then the Strategy they name. Each row is a radio group, so the arrow
 * keys move within it (a parent that uses the arrow keys should skip `[role=radiogroup]`). A small info button after
 * each label opens a card saying what the choice decides and what each option means.
 */
export function StrategyPicker({
  value,
  onChange,
  lang = DEFAULT_LANGUAGE,
}: {
  value: StrategyChoice;
  onChange: (next: StrategyChoice) => void;
  lang?: Language;
}) {
  const text = pageText(lang);
  return (
    <div className="grid gap-2">
      <Segmented
        label={text.guessPoolLabel}
        tip={[text.guessPoolTip, text.guessPoolAnswers, text.guessPoolGuesses]}
        aboutLabel={text.aboutChoice(text.guessPoolLabel)}
        value={value.pool}
        options={POOLS}
        names={POOL_NAMES}
        onChange={(pool) => onChange({ ...value, pool })}
      />
      <Segmented
        label={text.searchScopeLabel}
        tip={[text.searchScopeTip, text.searchScopeCandidates, text.searchScopeAll]}
        aboutLabel={text.aboutChoice(text.searchScopeLabel)}
        value={value.scope}
        options={SCOPES}
        names={SCOPE_NAMES}
        onChange={(scope) => onChange({ ...value, scope })}
      />
      <Segmented
        label={text.rankingLabel}
        tip={[text.rankingTip, text.rankingBits, text.rankingExpected]}
        aboutLabel={text.aboutChoice(text.rankingLabel)}
        value={value.by}
        options={RANKS}
        names={RANKING_NAMES}
        onChange={(by) => onChange({ ...value, by })}
      />
      <p className="text-sm text-meta">
        {text.strategyLabel}: <span className="text-text">{strategyFor(value.by, value.pool, value.scope).name}</span>
      </p>
    </div>
  );
}

// Hover delays, as for the glossary cards: open after a short rest, close a little after the pointer leaves.
const OPEN_DELAY = 150;
const CLOSE_DELAY = 250;

/**
 * The ⓘ button after a row's label and its card (a Radix Popover, looking like a glossary card): the first line says
 * what the row decides, then one line for each option. It opens on hover, on keyboard focus and on tap (a tap toggles);
 * Escape or a tap elsewhere closes it. The button sits outside the radio group, so the arrow keys stay the group's.
 */
function InfoTip({ label, lines }: { label: string; lines: readonly string[] }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // The last pointer gesture: for a tap, whether the card was already open when it began (a tap focuses first, which opens it).
  const gesture = useRef({ touch: false, wasOpen: false });
  useEffect(() => () => clearTimeout(timer.current), []);

  const later = (next: boolean, delay: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(next), delay);
  };
  const now = (next: boolean) => {
    clearTimeout(timer.current);
    setOpen(next);
  };
  const mouse = (e: React.PointerEvent) => e.pointerType === "mouse";
  // The Step-through Game steps on Left and Right; they are not for this button or its card.
  const keepArrows = (e: React.KeyboardEvent) => (e.key === "ArrowLeft" || e.key === "ArrowRight") && e.stopPropagation();
  const [summary, ...options] = lines;

  return (
    <Popover.Root open={open} onOpenChange={now}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-haspopup="dialog"
          className="inline-flex size-6 shrink-0 cursor-help items-center justify-center rounded-xs text-meta hover:text-text"
          onPointerEnter={(e) => mouse(e) && (open ? clearTimeout(timer.current) : later(true, OPEN_DELAY))}
          onPointerLeave={(e) => mouse(e) && later(false, CLOSE_DELAY)}
          onPointerDown={(e) => {
            gesture.current = { touch: !mouse(e), wasOpen: open };
          }}
          onClick={(e) => {
            // Radix toggles on click; a mouse click keeps a hovered card open, a tap toggles from before the tap.
            e.preventDefault();
            now(gesture.current.touch ? !gesture.current.wasOpen : true);
          }}
          onKeyDown={keepArrows}
          onFocus={() => !open && now(true)}
          onBlur={() => later(false, CLOSE_DELAY)}
        >
          <Info className="size-3.5" aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={4}
          collisionPadding={20}
          className="z-50 w-fit max-w-72 rounded-sm border border-rule-strong bg-popover px-3 py-2 font-sans text-sm leading-snug font-normal text-popover-foreground shadow-md outline-none max-sm:max-w-[calc(100vw-2.5rem)] sm:w-72 data-[state=open]:animate-in data-[state=open]:fade-in-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onPointerEnter={(e) => mouse(e) && clearTimeout(timer.current)}
          onPointerLeave={(e) => mouse(e) && later(false, CLOSE_DELAY)}
          onFocus={() => clearTimeout(timer.current)}
          onKeyDown={keepArrows}
        >
          <p>{summary}</p>
          <ul className="mt-1.5 grid gap-1">
            {options.map((line) => {
              const [name, ...rest] = line.split(": ");
              return (
                <li key={line}>
                  <strong className="font-medium">{name}</strong>: {rest.join(": ")}
                </li>
              );
            })}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Segmented<T extends string>({
  label,
  tip,
  aboutLabel,
  value,
  options,
  names,
  onChange,
}: {
  label: string;
  tip: readonly string[];
  aboutLabel: string;
  value: T;
  options: readonly T[];
  names: Record<T, string>;
  onChange: (next: T) => void;
}) {
  const labelId = useId();
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="flex w-32 shrink-0 items-center">
        <span id={labelId} className="text-sm text-meta">
          {label}
        </span>
        <InfoTip label={aboutLabel} lines={tip} />
      </span>
      <RadioGroup.Root
        aria-labelledby={labelId}
        orientation="horizontal"
        value={value}
        onValueChange={(next) => onChange(next as T)}
        className="inline-flex gap-0.5 rounded-sm border border-rule p-0.5"
      >
        {options.map((option) => (
          <RadioGroup.Item
            key={option}
            value={option}
            className="cursor-pointer rounded-xs px-2.5 py-1 text-sm whitespace-nowrap text-meta hover:bg-highlight-low hover:text-text data-[state=checked]:bg-highlight-med data-[state=checked]:text-text"
          >
            {names[option]}
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    </div>
  );
}
