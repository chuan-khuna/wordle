"use client";

import { ChevronRight, Pause, Play } from "lucide-react";
import type { ReactNode } from "react";
import { ControlPanel } from "@/components/controls/ControlPanel";
import { Button } from "@/components/ui/button";
import type { SolveResponse } from "@/lib/api";
import type { Language } from "@/lib/i18n/language";
import { pageText } from "@/lib/i18n/page-text";
import { parseMarks } from "@/lib/wordle/feedback";
import { Tile } from "./Tile";

/**
 * The sticky strip of a Game: Prev and Next, then each Guess with its Feedback Marks as small Tiles, then `status` (the
 * step in words, live) and `children` (the page's own controls or notes). Steps run from `first` (1 on Follow an Answer;
 * 0, before any Guess, on the Feedback Matrix page) to the Game's last Guess. The current Guess is marked
 * (`aria-current="step"`); a Guess is a button that calls `go` with its number. With `play` (opt-in; the Feedback Matrix
 * page) a Play button follows Next, showing Pause while `play.playing`; it calls `play.toggle`. `id` (optional) names the
 * strip's element, so a page can measure it (the Feedback Matrix page fits its grid in the viewport below it).
 */
export function GuessStrip({
  data,
  step,
  first,
  go,
  lang,
  status,
  play,
  children,
  id,
}: {
  data: SolveResponse;
  step: number;
  first: number;
  go: (n: number) => void;
  lang: Language;
  status: ReactNode;
  play?: { playing: boolean; toggle: () => void };
  children?: ReactNode;
  id?: string;
}) {
  const text = pageText(lang);
  const total = data.guesses;
  return (
    <ControlPanel plain id={id} className="sticky top-0 z-10 -mx-gutter border-b border-rule bg-background px-gutter py-2 sm:-mx-gutter-wide sm:px-gutter-wide">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <Button disabled={step <= first} onClick={() => go(step - 1)} aria-label={text.prevGuess}>
            ← {text.prev}
          </Button>
          <Button disabled={step >= total} onClick={() => go(step + 1)} aria-label={text.nextGuess}>
            {text.next} →
          </Button>
          {play && (
            <Button onClick={play.toggle}>
              {play.playing ? <Pause aria-hidden /> : <Play aria-hidden />}
              {play.playing ? text.pause : text.play}
            </Button>
          )}
        </div>
        <ol aria-label={text.guessStripLabel(data.answer)} className="flex flex-wrap items-center gap-y-1">
          {data.steps.map((s) => (
            <li key={s.number} className="flex items-center">
              {s.number > 1 && <ChevronRight className="size-4 text-meta" aria-hidden />}
              <button
                type="button"
                aria-current={s.number === step ? "step" : undefined}
                aria-label={text.jumpToGuess(s.number, s.guess)}
                onClick={() => go(s.number)}
                className={`flex cursor-pointer gap-0.5 rounded-xs p-1 hover:bg-highlight-low ${s.number === step ? "bg-highlight-med outline-2 outline-offset-0 outline-accent" : ""}`}
              >
                {[...s.guess].map((l, i) => (
                  <Tile key={i} letter={l} mark={parseMarks(s.marks)?.[i] ?? 0} tiny />
                ))}
              </button>
            </li>
          ))}
        </ol>
        <span className="text-sm text-meta" aria-live="polite">
          {status}
        </span>
        {children}
      </div>
    </ControlPanel>
  );
}
