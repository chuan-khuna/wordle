"use client";

import { Suspense, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { type SplitResponse, postSplit } from "@/lib/api";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";
import { pageText } from "@/lib/i18n/page-text";
import { WORD_LENGTH } from "@/lib/wordle/feedback";
import { SplitGroups } from "./SplitGroups";
import { WordRow, cleanWord } from "./WordRow";
import { useGuessCheck } from "./useGuessCheck";
import { useWidgetParam } from "./useWidgetParam";

const DEFAULT_OPENER = "salet";

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

function Split({ lang }: { lang: Language }) {
  const text = pageText(lang);
  const uid = useId();
  const [opener, setOpener] = useWidgetParam(undefined, "opener", DEFAULT_OPENER);
  const [fit, setFit] = useWidgetParam(undefined, "fit", "");
  const g = cleanWord(opener);
  const check = useGuessCheck(g);
  const ready = g.length === WORD_LENGTH && !check.checking && !check.error;

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

  const lg = useLg();
  const fitted = fit === "1" && lg;
  const failed = failure?.word === g ? failure.message : null;
  const waiting = ready && !failed && data?.word !== g;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
        <WordRow id={`${uid}-opener`} label={text.openerLabel} value={g} onChange={setOpener} error={check.error} />
        <Button type="button" variant="default" aria-pressed={fit === "1"} onClick={() => setFit(fit === "1" ? "" : "1")} className="hidden lg:inline-flex aria-pressed:bg-highlight-med">
          {text.fullScreen}
        </Button>
      </div>
      <div aria-live="polite" className="min-h-6 text-sm">
        {g.length < WORD_LENGTH && <p className="text-meta">{text.typeOpener}</p>}
        {waiting && <p className="text-meta">{text.splitting}</p>}
        {failed && (
          <p role="alert" className="text-error">
            {failed}
          </p>
        )}
      </div>
      {data && !fitted && <SplitGroups split={data} lang={lang} />}
      {data && fitted && <FitView split={data} lang={lang} onExit={() => setFit("")} />}
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

/**
 * Fit mode: a full-window overlay (above the sidebar) with a small bar (the Opener and an Exit button; Escape also exits)
 * and the whole split scaled to fill the rest of the window with no scrolling, like the video's single shot.
 * The split's height H(W) falls as its layout width W grows, and the best W is where H/W equals the window's height over its
 * width. That is found by bisection, each pass laying the blocks out at W (column counts follow W, not the container; the
 * layout effect re-runs before paint) and reading the height. It then scales by min(width / W, height / H, 1). Searched again
 * when the window or the split changes.
 */
function FitView({ split, lang, onExit }: { split: SplitResponse; lang: Language; onExit: () => void }) {
  const text = pageText(lang);
  const area = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [layoutW, setLayoutW] = useState(1200);
  const [scale, setScale] = useState<number | null>(null);
  const search = useRef({ key: "", lo: MIN_W, hi: MAX_W, passes: 0 });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onExit();
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
    const key = `${split.word}|${size.w}x${size.h}`;
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
  }, [split, size, layoutW]);

  const shown = scale ?? 1;
  return (
    <div role="dialog" aria-label={text.fullScreen} className="fixed inset-0 z-[100] flex flex-col bg-background">
      <div className="flex items-center gap-4 border-b border-rule px-4 py-2">
        <span className="font-tile text-lg font-bold tracking-widest uppercase text-text">{split.word}</span>
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
          <SplitGroups split={split} lang={lang} layoutWidth={layoutW} />
        </div>
      </div>
    </div>
  );
}
