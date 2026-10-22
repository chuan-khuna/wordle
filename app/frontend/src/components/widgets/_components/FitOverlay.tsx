"use client";

import { type ReactNode, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Whether the window is at the `lg` breakpoint or wider (false on the server). Full screen is offered only there. */
export function useLg(): boolean {
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
 * Full screen: a full-window overlay (above the sidebar) with a small bar (`title` and an X close button; Escape also
 * closes) and `children(layoutW)` scaled to fill the rest of the window with no scrolling, like the video's single shot.
 * The content's height H(W) falls as its layout width W grows, and the best W is where H/W equals the window's height
 * over its width. That is found by bisection, each pass laying the content out at W (it must follow W, not its
 * container; the layout effect re-runs before paint) and reading the height. It then scales by min(width / W, height / H, 1).
 * First, though, it tries the window's own width: content that fits there unscaled (a short Answer's path) stays at
 * that width and full size, rather than being narrowed and wrapped for nothing.
 * Searched again when the window or `contentKey` changes (give it whatever changes the content's shape); `content` is
 * read only to re-measure when the content itself changes.
 */
export function FitOverlay({
  title,
  label,
  closeLabel,
  contentKey,
  content,
  onExit,
  children,
}: {
  title: ReactNode;
  label: string;
  closeLabel: string;
  contentKey: string;
  content: unknown;
  onExit: () => void;
  children: (layoutW: number) => ReactNode;
}) {
  const area = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [layoutW, setLayoutW] = useState(1200);
  const [scale, setScale] = useState<number | null>(null);
  const search = useRef({ key: "", lo: MIN_W, hi: MAX_W, passes: 0, probed: false });

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
    let s = search.current;
    const key = `${contentKey}|${size.w}x${size.h}`;
    if (s.key !== key) {
      // A new window or content: start the search again from the whole range.
      s = search.current = { key, lo: MIN_W, hi: MAX_W, passes: 0, probed: false };
      setScale(null);
      // Already at the window's width, nothing here would re-run this effect: probe it now.
      if (layoutW !== size.w) {
        // The search is a measure-then-relayout loop before paint; each pass sets the next width.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLayoutW(size.w);
        return;
      }
    }
    const height = el.scrollHeight;
    if (!s.probed) {
      s.probed = true;
      if (height <= size.h) {
        s.lo = s.hi = layoutW;
        setScale(1);
      } else setLayoutW(Math.round(size.w * 1.5));
      return;
    }
    // Too tall for its width (H/W above the window's h/w): go wider; otherwise go narrower.
    if (height * size.w > layoutW * size.h) s.lo = layoutW;
    else s.hi = layoutW;
    s.passes += 1;
    if (s.hi - s.lo > W_TOLERANCE && s.passes < MAX_PASSES) setLayoutW(Math.round((s.lo + s.hi) / 2));
    else if (layoutW !== s.hi) setLayoutW(s.hi);
    else setScale(Math.min(size.w / layoutW, size.h / height, 1));
  }, [contentKey, content, size, layoutW]);

  const shown = scale ?? 1;
  return (
    <div role="dialog" aria-label={label} className="fixed inset-0 z-[100] flex flex-col bg-background">
      <div className="flex items-center gap-4 border-b border-rule px-4 py-2">
        <span className="font-tile text-lg font-bold tracking-widest uppercase text-text">{title}</span>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onExit} aria-label={closeLabel} title={closeLabel} className="ml-auto">
          <X />
        </Button>
      </div>
      {/* The page's margin around the scaled content; the area measured for the fit is inside it. */}
      <div className="min-h-0 flex-1 px-6 py-4 sm:px-10 sm:py-6">
        <div ref={area} className="relative h-full overflow-hidden">
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
            {children(layoutW)}
          </div>
        </div>
      </div>
    </div>
  );
}
