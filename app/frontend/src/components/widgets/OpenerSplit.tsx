"use client";

import { Suspense, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Maximize2, Plus, X } from "lucide-react";
import { ControlPanel } from "@/components/controls/ControlPanel";
import { Field } from "@/components/controls/Field";
import { SegmentedControl } from "@/components/controls/SegmentedControl";
import { Button } from "@/components/ui/button";
import { type SplitResponse, postSplit } from "@/lib/api";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";
import { followPath } from "@/lib/i18n/paths";
import { pageText } from "@/lib/i18n/page-text";
import { formatLeft } from "@/lib/widgets/split-chart";
import { betterFigures, singleWordGroups } from "@/lib/widgets/split-groups";
import { WORD_LENGTH } from "@/lib/wordle/feedback";
import { cn } from "@/lib/utils";
import { SplitBars } from "./SplitBars";
import { SplitGroups } from "./SplitGroups";
import { WordRow, cleanWord } from "./WordRow";
import { useGuessCheck } from "./useGuessCheck";
import { useParamInitial, useParamSync, useWidgetParam } from "./useWidgetParam";

const DEFAULT_OPENER = "salet";

/** How a split is drawn: `SplitGroups` blocks, or the Feedback Split explorer's bars and word list. */
type SplitView = "blocks" | "bars";

/**
 * The Opener Split page's content: an Opener input (URL param `opener`, default `salet`) and `SplitGroups` of that
 * Opener over the whole Answer List (an empty State). A word off the Guess List shows the API's message and keeps the
 * last good split on screen.
 */
export function OpenerSplit({ lang = DEFAULT_LANGUAGE }: { lang?: Language }) {
  return (
    <Suspense fallback={<p className="text-sm text-meta">{pageText(lang).splitting}</p>}>
      <Split lang={lang} />
    </Suspense>
  );
}

/** The word the compared Opener starts as: FUZZY, the spec's bad Opener, on the Guess List and a poor split next to SALET. */
const DEFAULT_COMPARE = "fuzzy";

/**
 * One Opener's split of the Answer List: the typed word, the API's verdict on it, and the last good split. A word off
 * the Guess List sets `check.error` (shown on its own input); a failed split keeps the last good one on screen.
 */
function useOpenerSplit(word: string, enabled = true) {
  const g = cleanWord(word);
  const check = useGuessCheck(g, enabled);
  const ready = enabled && g.length === WORD_LENGTH && !check.checking && !check.error;

  // The last good split, and the API's message for the word last asked about.
  const [data, setData] = useState<SplitResponse | null>(null);
  const [failure, setFailure] = useState<{ word: string; message: string } | null>(null);
  useEffect(() => {
    if (!ready) return;
    const ctl = new AbortController();
    const timer = setTimeout(() => {
      postSplit(g, [], ctl.signal).then(
        (split) => {
          setData(split);
          setFailure(null);
        },
        (e: Error) => {
          if (e.name !== "AbortError") setFailure({ word: g, message: e.message });
        },
      );
    }, 250);
    return () => {
      clearTimeout(timer);
      ctl.abort();
    };
  }, [ready, g]);

  const failed = failure?.word === g ? failure.message : null;
  return { g, check, data, failed, waiting: ready && !failed && data?.word !== g };
}

/** A toolbar cell beside the fields: as tall as the tiles and level with them (below the label row, `h-6`). */
const ACTION_CELL = "mt-6 flex h-12 items-center sm:h-14";

function Split({ lang }: { lang: Language }) {
  const text = pageText(lang);
  const uid = useId();
  const [opener, setOpener] = useWidgetParam(undefined, "opener", DEFAULT_OPENER);
  const [fit, setFit] = useWidgetParam(undefined, "fit", "");
  // Blocks (the default, left out of the URL) or Bars (`view=bars`: the Feedback Split explorer's chart and word list).
  const [viewParam, setView] = useWidgetParam(undefined, "view", "blocks");
  const view: SplitView = viewParam === "bars" ? "bars" : "blocks";
  // Compare is on while `compare` is in the URL; it stays on if the word is cleared to be retyped.
  const initialCompare = useParamInitial(undefined, "compare", "");
  const [comparing, setComparing] = useState(initialCompare !== "");
  const [compare, setCompare] = useState(initialCompare || DEFAULT_COMPARE);
  useParamSync(undefined, "compare", comparing ? compare : "", "");

  const first = useOpenerSplit(opener);
  const second = useOpenerSplit(compare, comparing);
  const lg = useLg();
  const fitted = fit === "1" && lg && view === "blocks";
  const fittedSplits = [first.data, comparing ? second.data : null].filter((d) => d !== null);

  return (
    <div className="space-y-8">
      {/* One toolbar: the fields, then the actions, which line up with the middle of the tiles (with Compare on, Full screen drops to a row of its own below `xl`, where the fields fill the row). */}
      <ControlPanel plain className="flex flex-wrap items-start gap-x-6 gap-y-3">
        <OpenerInput uid={`${uid}-opener`} label={text.openerLabel} value={first.g} onChange={setOpener} state={first} lang={lang} />
        {comparing && (
          <OpenerInput
            uid={`${uid}-compare`}
            label={text.comparedOpenerLabel}
            value={second.g}
            onChange={setCompare}
            state={second}
            lang={lang}
            onRemove={() => setComparing(false)}
          />
        )}
        {!comparing && (
          <div className={ACTION_CELL}>
            <Button type="button" onClick={() => setComparing(true)}>
              <Plus aria-hidden="true" />
              {text.compare}
            </Button>
          </div>
        )}
        <Field label={text.splitViewLabel} labelId={`${uid}-view`} className="gap-1" labelClassName="flex h-6 items-center">
          <div className="flex h-12 items-center sm:h-14">
            <SegmentedControl<SplitView>
              labelledBy={`${uid}-view`}
              options={["blocks", "bars"]}
              names={{ blocks: text.blocksView, bars: text.barsView }}
              value={view}
              onChange={(next) => setView(next === "bars" ? "bars" : "")}
            />
          </div>
        </Field>
        {view === "blocks" && (
          <div className={cn(ACTION_CELL, "hidden lg:ml-auto lg:flex", comparing && "max-xl:mt-0 max-xl:h-9")}>
            <Button type="button" aria-pressed={fit === "1"} onClick={() => setFit(fit === "1" ? "" : "1")} className="aria-pressed:bg-highlight-med">
              <Maximize2 aria-hidden="true" />
              {text.fullScreen}
            </Button>
          </div>
        )}
      </ControlPanel>
      {/* The two splits sit side by side from `xl`; each SplitGroups measures its own column. */}
      <div className={comparing ? "grid grid-cols-1 gap-x-10 gap-y-10 xl:grid-cols-2" : undefined}>
        {first.data && <OpenerResult split={first.data} other={comparing ? second.data : null} lang={lang} view={view} showSplit={!fitted} />}
        {comparing && second.data && <OpenerResult split={second.data} other={first.data} lang={lang} view={view} showSplit={!fitted} />}
      </div>
      {fitted && fittedSplits.length > 0 && <FitView splits={fittedSplits} lang={lang} onExit={() => setFit("")} />}
    </div>
  );
}

/** One Opener's input (with its own error), its Remove button if any, and its status line. */
function OpenerInput({
  uid,
  label,
  value,
  onChange,
  state,
  lang,
  onRemove,
}: {
  uid: string;
  label: string;
  value: string;
  onChange: (word: string) => void;
  state: ReturnType<typeof useOpenerSplit>;
  lang: Language;
  onRemove?: () => void;
}) {
  const text = pageText(lang);
  const { g, check, failed, waiting } = state;
  return (
    <div className="space-y-1">
      <Field label={label} htmlFor={uid} className="gap-1" labelClassName="flex h-6 items-center">
        <div className="flex items-start gap-2">
          <WordRow id={uid} label={label} hideLabel value={value} onChange={onChange} error={check.error} />
          {onRemove && (
            <div className="flex h-12 items-center sm:h-14">
              <Button type="button" variant="ghost" size="icon-sm" aria-label={text.removeCompare} onClick={onRemove}>
                <X aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
      </Field>
      <div aria-live="polite" className="min-h-6 text-sm">
        {g.length < WORD_LENGTH && <p className="text-meta">{text.typeOpener}</p>}
        {waiting && <p className="text-meta">{text.splitting}</p>}
        {failed && (
          <p role="alert" className="text-error">
            {failed}
          </p>
        )}
      </div>
    </div>
  );
}

/** One Opener's stat card and its split, as `SplitGroups` blocks or the explorer's bars and word list (a column of the page when Compare is on). */
function OpenerResult({
  split,
  other,
  lang,
  view,
  showSplit,
}: {
  split: SplitResponse;
  other: SplitResponse | null;
  lang: Language;
  view: SplitView;
  showSplit: boolean;
}) {
  const wordLink = (answer: string) => followPath(lang, { answer, opener: split.word });
  return (
    <section className="min-w-0 space-y-4 font-sans">
      <SplitFigures split={split} other={other} lang={lang} />
      {showSplit && view === "blocks" && <SplitGroups split={split} lang={lang} wordLink={wordLink} />}
      {view === "bars" && <SplitBars data={split} text={pageText(lang)} wordLink={wordLink} />}
    </section>
  );
}

/**
 * A card for one split: the Opener in the tile font, then the five figures in equal cells (formatted as the Feedback
 * Split explorer's chart title does: `formatLeft`, bits to two decimals). Labels have a two-line height so the values
 * share a baseline. With `other` (Compare on), the better value of each pair gets a small marker and the worse one is quiet.
 */
function SplitFigures({ split, other, lang }: { split: SplitResponse; other: SplitResponse | null; lang: Language }) {
  const text = pageText(lang);
  const better = other ? betterFigures(split, other) : null;
  const figures = [
    { name: text.groupsFigure, value: String(split.groups), unit: "" },
    { name: text.largestGroupFigure, value: String(split.largest_group), unit: "" },
    { name: text.singleWordGroupsFigure, value: String(singleWordGroups(split.split)), unit: "" },
    { name: text.expectedInformationFigure, value: split.bits.toFixed(2), unit: text.bits },
    { name: text.expectedCandidatesFigure, value: formatLeft(split.expected_candidates), unit: "" },
  ];
  return (
    <div className="@container overflow-hidden rounded-md border border-rule bg-highlight-low">
      <div className="border-b border-rule px-3 py-2">
        <span className="font-tile text-base font-bold tracking-widest uppercase text-text">{split.word}</span>
      </div>
      <dl aria-label={text.figuresLabel(split.word)} className="-mt-px -ml-px grid grid-cols-2 @md:grid-cols-5">
        {figures.map(({ name, value, unit }, i) => {
          const verdict = better?.[i];
          return (
            <div key={name} className="relative flex flex-col justify-between gap-1 border-t last:col-span-2 @md:last:col-span-1 border-l border-rule px-2.5 py-2.5">
              <dt className="min-h-8 pr-2 font-sans text-xs leading-4 text-meta">
                {name}
                {verdict === true && (
                  <>
                    <span aria-hidden="true" className="absolute top-2 right-1.5 text-[0.625rem] leading-none text-accent">
                      ▲
                    </span>
                    <span className="sr-only">{text.betterFigure}</span>
                  </>
                )}
              </dt>
              <dd className={cn("font-sans text-lg leading-7 tabular-nums", verdict === false ? "text-meta" : "text-text")}>
                {value}
                {unit && <span className="ml-1 text-xs text-meta">{unit}</span>}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

/** Whether the window is at the `lg` breakpoint or wider (false on the server). */
function useLg(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia("(min-width: 1024px)");
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false,
  );
}

/** The narrowest and widest layout width the fit search tries, in pixels. */
const MIN_W = 240;
const MAX_W = 8000;
/** The search stops when its bracket is this narrow, or after this many passes. */
const W_TOLERANCE = 6;
const MAX_PASSES = 16;
/** The gap between the two columns of a Compare in fit mode, in layout pixels (`gap-x-12`). */
const FIT_GAP = 48;

/**
 * Fit mode: a full-window overlay (above the sidebar) with a small bar (the Opener, or both with Compare on, and an Exit
 * button; Escape also exits) and the whole split (both splits side by side in two equal columns, laid out at one width and scaled together) scaled to fill the rest of the window with no scrolling, like the video's single shot.
 * The split's height H(W) (the taller column's, with Compare) falls as its layout width W grows, and the best W is where H/W equals the window's height over its
 * width. That is found by bisection, each pass laying the blocks out at W (column counts follow W, not the container; the
 * layout effect re-runs before paint) and reading the height. It then scales by min(width / W, height / H, 1). Searched again
 * when the window or the split changes.
 */
function FitView({ splits, lang, onExit }: { splits: SplitResponse[]; lang: Language; onExit: () => void }) {
  const text = pageText(lang);
  const area = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [layoutW, setLayoutW] = useState(1200);
  const [scale, setScale] = useState<number | null>(null);
  const search = useRef({ key: "", lo: MIN_W, hi: MAX_W, passes: 0 });
  const words = splits.map((x) => x.word).join(" ");

  useEffect(() => {
    // Radix prevents default when Escape closes a word's card, so that Escape closes only the card.
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !e.defaultPrevented && onExit();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onExit]);

  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = inner.current;
    if (!el || size.w === 0 || size.h === 0) return;
    const s = search.current;
    const key = `${words}|${size.w}x${size.h}`;
    if (s.key !== key) {
      // A new window or split: start the search again from the whole range.
      search.current = { key, lo: MIN_W, hi: MAX_W, passes: 0 };
      setScale(null);
      setLayoutW(Math.round(size.w * 1.5));
      return;
    }
    const height = el.scrollHeight;
    // Too tall for its width (H/W above the window's h/w): go wider; otherwise go narrower.
    if (height * size.w > layoutW * size.h) s.lo = layoutW;
    else s.hi = layoutW;
    s.passes += 1;
    if (s.hi - s.lo > W_TOLERANCE && s.passes < MAX_PASSES) setLayoutW(Math.round((s.lo + s.hi) / 2));
    else if (layoutW !== s.hi) setLayoutW(s.hi);
    else setScale(Math.min(size.w / layoutW, size.h / height, 1));
  }, [words, splits, size, layoutW]);

  const shown = scale ?? 1;
  // Each split's column: the layout width less the gaps (3rem = 48px), shared equally.
  const columnW = (layoutW - FIT_GAP * (splits.length - 1)) / splits.length;
  return (
    <div role="dialog" aria-label={text.fullScreen} className="fixed inset-0 z-[100] flex flex-col bg-background">
      <div className="flex items-center gap-4 border-b border-rule px-4 py-2">
        <span className="font-tile text-lg font-bold tracking-widest uppercase text-text">{splits.map((x) => x.word).join(" · ")}</span>
        <Button type="button" variant="default" size="sm" onClick={onExit} className="ml-auto">
          {text.closeFullScreen}
        </Button>
      </div>
      <div ref={area} className="relative min-h-0 flex-1 overflow-hidden">
        <div
          ref={inner}
          data-scale={scale ?? undefined}
          className="absolute top-0"
          style={{
            width: layoutW,
            left: Math.max(0, (size.w - layoutW * shown) / 2),
            transform: `scale(${shown})`,
            transformOrigin: "top left",
            visibility: scale === null ? "hidden" : "visible",
          }}
        >
          <div className="grid gap-x-12" style={{ gridTemplateColumns: `repeat(${splits.length}, minmax(0, 1fr))` }}>
            {splits.map((split, i) => (
              <SplitGroups key={i} split={split} lang={lang} layoutWidth={columnW} wordLink={(answer) => followPath(lang, { answer, opener: split.word })} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
