"use client";

import { Popover } from "radix-ui";
import { Suspense, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ControlPanel } from "@/components/controls/ControlPanel";
import { FIELD_LABEL } from "@/components/controls/Field";
import { SegmentedControl } from "@/components/controls/SegmentedControl";
import { type SolveResponse, getFeedbackMatrix, postCandidates } from "@/lib/api";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";
import { pageText } from "@/lib/i18n/page-text";
import {
  type Cell,
  LEGEND_CODES,
  PLAY_STEP_MS,
  SCALE_ROLES,
  type Rgb,
  ZOOMS,
  type Zoom,
  answerIndex,
  buildScale,
  cellAt,
  cellRect,
  dimmedMask,
  fadeProgress,
  fillDimRow,
  fillGrid,
  gridSize,
  guessRows,
  marksOfCode,
  mixLevels,
  parseHex,
  parseZoom,
  playNext,
  playStart,
  sizesPerStep,
  stateKey,
  statesPerStep,
} from "@/lib/widgets/matrix-grid";
import type { Mark } from "@/lib/wordle/feedback";
import { GuessStrip } from "./_components/GuessStrip";
import { GameInputs, useSolverGame } from "./_components/SolverGame";
import { Tile } from "./_components/Tile";
import { WidgetFrame } from "./_components/ui";
import { CARD } from "./_components/useHoverCard";
import { useLoad } from "./_components/useLoad";
import { useReducedMotion } from "./_components/useReducedMotion";
import { useWidgetParam } from "./_components/useWidgetParam";

/** Grey, if a theme role cannot be read (it always can in the ten themes). */
const FALLBACK: Rgb = [128, 128, 128];

/** The scale's colours from the theme roles on `<html>` (set by `data-theme`). */
function themeScale(): Uint8ClampedArray {
  const style = getComputedStyle(document.documentElement);
  return buildScale(SCALE_ROLES.map((role) => parseHex(style.getPropertyValue(role)) ?? FALLBACK));
}

/** The dimming veil's colour: the page background, so a dimmed column fades into the page. */
function themeVeil(): Rgb {
  return parseHex(getComputedStyle(document.documentElement).getPropertyValue("--background")) ?? FALLBACK;
}

/**
 * The Feedback Matrix page's content: the Solver's Game (`GameInputs`, the URL params `answer`, `pool`, `scope`,
 * `by`, `opener`, and `step`, 0 before any Guess), a sticky strip of its Guesses with the Candidate Set's size at
 * each step, and the Answer × Answer Feedback Matrix on a canvas with the columns no longer Candidates dimmed.
 * One cell per (Guess, Answer) pair, rows Guesses and columns Answers, both in Answer List order (`answers`, the
 * build-time list, sorted as the backend's matrix is), so the Wins are the diagonal. The bytes come from
 * `GET /api/feedback-matrix`. They are painted once into a one-pixel-per-cell image (an offscreen canvas), which is
 * drawn scaled to the visible canvas with smoothing off; a theme change refills the image, a resize or a scroll only
 * redraws it. Zoom (fit, 2×, 4×, 8×; the `zoom` URL param), the dimming layer and the hover card are in `Grid`.
 */
export function FeedbackMatrix({ answers, lang = DEFAULT_LANGUAGE }: { answers: readonly string[]; lang?: Language }) {
  return (
    <Suspense fallback={<div className="aspect-square w-full bg-overlay" />}>
      <Matrix answers={answers} lang={lang} />
    </Suspense>
  );
}

/** What the grid shows of the Game at a step: the columns dimmed, the rows of the Guesses played, and the Answer's column. */
type GameLayer = {
  /** 1 for each column (Answer) no longer a Candidate. */
  mask: Uint8Array;
  /** The rows of the Guesses played so far that are on the Answer List; `current` is the last one played. */
  rows: { row: number; current: boolean }[];
  /** The Answer's column. */
  answerCol: number;
  answer: string;
};

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

function Matrix({ answers, lang }: { answers: readonly string[]; lang: Language }) {
  const text = pageText(lang);
  const { data, error } = useLoad("feedback-matrix", getFeedbackMatrix);
  const side = answers.length;
  const wrongSize = data !== null && data.length !== side * side;
  const cells = data !== null && !wrongSize ? data : null;

  const game = useSolverGame();
  // An Answer or Opener the API rejects keeps the last good Game on the grid; its message shows at the input.
  const shown = game.data ?? game.lastGood;
  const [stepText, setStepText] = useWidgetParam(undefined, "step", "0");
  const total = shown?.guesses ?? 0;
  const parsed = Number.parseInt(stepText, 10);
  const step = clamp(Number.isFinite(parsed) ? parsed : 0, 0, total);
  // Play steps through the Game on a timer; Prev, Next or a Guess in the strip (`go`) stops it. It stops by itself at
  // the Win: `playing` is only true while a step is left.
  const [playOn, setPlayOn] = useState(false);
  // Another Game (a new Answer, Strategy or Opener) stops Play.
  const [playedGame, setPlayedGame] = useState(shown);
  if (shown !== playedGame) {
    setPlayedGame(shown);
    setPlayOn(false);
  }
  const playing = playOn && step < total;
  const go = (n: number) => {
    setPlayOn(false);
    setStepText(String(clamp(n, 0, total)));
  };
  const togglePlay = () => {
    if (playing) return setPlayOn(false);
    setStepText(String(playStart(step, total)));
    setPlayOn(true);
  };
  const reducedMotion = useReducedMotion();
  const best = !game.custom && game.data ? game.data.steps[0].guess : "";

  const sets = useCandidateSets(shown);
  const states = useMemo(() => (shown ? statesPerStep(shown) : []), [shown]);
  const rowsOf = useMemo(() => (shown ? guessRows(shown, answers) : []), [shown, answers]);
  const sizes = useMemo(() => (shown ? sizesPerStep(shown) : []), [shown]);
  const setKey = step > 0 && states[step] ? stateKey(states[step]) : null;
  const words = setKey === null ? null : sets.words[setKey];
  const failure = setKey === null ? undefined : sets.failures[setKey];
  // The mask for this step; while its Candidate Set loads, the last mask stays (no flash of the whole grid).
  const next = useMemo(() => (words === undefined ? null : dimmedMask(answers, words)), [answers, words]);
  const [mask, setMask] = useState<Uint8Array>(() => dimmedMask(answers, null));
  if (next && next !== mask) setMask(next);
  // The step is on the grid once its Candidate Set is in; Play holds it for `PLAY_STEP_MS` from then (a step that is
  // slow to load is not cut short), then shows the next. `step` goes to the URL with `replaceState`: no history entry.
  const ready = step === 0 || words !== undefined;
  useEffect(() => {
    if (!playing || !ready) return;
    const after = playNext(step, total);
    if (after === null) return;
    const timer = window.setTimeout(() => setStepText(String(after)), PLAY_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [playing, ready, step, total, setStepText]);

  const layer: GameLayer | null = useMemo(
    () =>
      shown
        ? {
            mask,
            rows: rowsOf.flatMap((row, k) => (row !== null && k < step ? [{ row, current: k === step - 1 }] : [])),
            answerCol: answerIndex(answers, shown.answer),
            answer: shown.answer,
          }
        : null,
    [shown, mask, rowsOf, step, answers],
  );
  const offList = shown ? shown.steps.filter((_, k) => rowsOf[k] === null) : [];

  return (
    <ControlPanel plain className="space-y-6">
      <GameInputs game={game} best={best} lang={lang} />
      {shown && (
        <GuessStrip
          data={shown}
          step={step}
          first={0}
          go={go}
          lang={lang}
          play={{ playing, toggle: togglePlay }}
          status={step === 0 ? text.matrixStart : text.guessOf(step, total)}>
          <span
            role="group"
            className="flex flex-wrap items-baseline gap-x-2 text-sm"
            aria-label={text.matrixSizes(sizes.map((n) => n.toLocaleString("en-US")).join(" → "), step)}
          >
            <span className={FIELD_LABEL}>{text.matrixSizesLabel}</span>
            <span aria-hidden className="font-mono tabular-nums">
              {sizes.map((n, k) => (
                <span key={k}>
                  {k > 0 && <span className="text-meta"> → </span>}
                  <span className={k === step ? "font-bold text-text" : "text-meta"}>{n.toLocaleString("en-US")}</span>
                </span>
              ))}
            </span>
          </span>
          {offList.map((s) => (
            <p key={s.number} className="basis-full text-xs text-meta">
              {text.matrixNoRow(s.guess)}
            </p>
          ))}
        </GuessStrip>
      )}
      {shown && !shown.solved && <p className="text-sm text-error">{text.notSolved}</p>}
      {failure ? (
        <p role="alert" className="text-sm text-error">
          {failure}
        </p>
      ) : (
        setKey !== null && words === undefined && <p className="text-sm text-meta">{text.matrixCandidatesLoading}</p>
      )}
      <WidgetFrame title={text.matrixFigure}>
        <div className="grid gap-3">
          <p className="text-xs text-meta">{text.matrixAxes(answers[0] ?? "", answers[side - 1] ?? "", side.toLocaleString("en-US"))}</p>
          {error ? (
            <p className="text-sm text-error">{error}</p>
          ) : wrongSize ? (
            <p className="text-sm text-error">{text.matrixWrongSize}</p>
          ) : cells ? (
            <Grid cells={cells} answers={answers} layer={layer} fade={!reducedMotion} label={text.matrixLabel(side.toLocaleString("en-US"))} lang={lang} />
          ) : (
            <div className="grid aspect-square w-full place-items-center bg-overlay text-sm text-meta">{text.matrixLoading}</div>
          )}
          <Legend lang={lang} />
        </div>
      </WidgetFrame>
    </ControlPanel>
  );
}

/**
 * The Candidate Set after each Guess of `game`, from `POST /api/candidates` with the State so far: one call per step,
 * all asked at once when the Game arrives, and cached by State, so a step (or a Game) seen before is never asked again.
 */
function useCandidateSets(game: SolveResponse | null): { words: Record<string, string[]>; failures: Record<string, string> } {
  const asked = useRef(new Set<string>());
  const [words, setWords] = useState<Record<string, string[]>>({});
  const [failures, setFailures] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!game) return;
    const ctl = new AbortController();
    for (const state of statesPerStep(game).slice(1)) {
      const key = stateKey(state);
      if (asked.current.has(key)) continue;
      asked.current.add(key);
      postCandidates(state, ctl.signal).then(
        (r) => setWords((prev) => ({ ...prev, [key]: r.words })),
        (e: Error) => {
          asked.current.delete(key);
          if (e.name !== "AbortError") setFailures((prev) => ({ ...prev, [key]: e.message }));
        },
      );
    }
    return () => ctl.abort();
  }, [game]);
  return { words, failures };
}

/** The zoom buttons' names other than `fit`'s. */
const ZOOM_NAMES = { "2": "2×", "4": "4×", "8": "8×" } as const;

/** Where the pointer last was over the frame, and whether it is a mouse (a touch or a pen taps instead of hovering). */
type Pointer = { x: number; y: number; mouse: boolean };

/**
 * The grid in a square frame. At `fit` the whole grid fills the frame; at 2×, 4× or 8× (the `zoom` URL param) the frame
 * scrolls over a grid that many times wider, so the page never scrolls sideways. The visible canvas is only the frame's
 * size: each draw scales the one-pixel-per-cell image by the zoom and shifts it by the scroll, with smoothing off, so
 * cells stay crisp at every zoom. Hovering (or tapping) a cell outlines it and shows its Guess, Answer and Feedback in a card.
 *
 * The Game (`layer`) is drawn over the grid without touching its image: the dimming is a second offscreen image, one
 * pixel per column (the veil over each column no longer a Candidate, clear over the rest), drawn stretched over the
 * whole grid with the same transform, so a step change refills 2,315 pixels, not 5.4 million. The rows of the Guesses
 * played are outlined (elements in the scrolling spacer, so they scroll with it), and a marker above the frame points
 * at the Answer's column, moved with the horizontal scroll at each draw.
 *
 * With `fade`, a new mask does not switch the columns at once: each animation frame for `FADE_MS` mixes the dimming
 * levels on the screen towards the new mask (`mixLevels`, eased by `fadeProgress`), refills the one-row image and
 * redraws. Only the 2,315-pixel row is refilled; the grid image is untouched. Without `fade` (`prefers-reduced-motion`)
 * the new mask shows at once.
 */
function Grid({
  cells,
  answers,
  layer,
  fade,
  label,
  lang,
}: {
  cells: Uint8Array;
  answers: readonly string[];
  layer: GameLayer | null;
  fade: boolean;
  label: string;
  lang: Language;
}) {
  const text = pageText(lang);
  const side = answers.length;
  const [zoomText, setZoomText] = useWidgetParam(undefined, "zoom", "fit");
  const zoom = parseZoom(zoomText);
  const zoomed = zoom !== "fit";
  const zoomLabelId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLCanvasElement | null>(null);
  const dimRef = useRef<HTMLCanvasElement | null>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  // The frame's width (CSS px): the grid's side at `fit`, which the zoom levels multiply.
  const [fitWidth, setFitWidth] = useState(0);
  const [hover, setHover] = useState<Cell | null>(null);
  // So a scroll under a resting mouse moves the card to the cell now under it.
  const pointer = useRef<Pointer | null>(null);
  // The view's centre as a fraction of the grid, kept across a zoom change.
  const centre = useRef<{ x: number; y: number } | null>(null);
  const size = gridSize(fitWidth, zoom);
  const answerCol = layer?.answerCol ?? -1;
  const mask = layer?.mask ?? null;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    const image = imageRef.current;
    if (!canvas || !frame || !image || size <= 0) return;
    const ratio = window.devicePixelRatio;
    const width = frame.clientWidth;
    const height = frame.clientHeight;
    const w = Math.max(1, Math.round(width * ratio));
    const h = Math.max(1, Math.round(height * ratio));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, w, h);
    context.imageSmoothingEnabled = false;
    // In device pixels, with the grid's top-left corner at minus the scroll.
    context.setTransform(ratio, 0, 0, ratio, -frame.scrollLeft * ratio, -frame.scrollTop * ratio);
    context.drawImage(image, 0, 0, size, size);
    if (dimRef.current) context.drawImage(dimRef.current, 0, 0, size, size);
    const marker = markerRef.current;
    if (marker && answerCol >= 0) {
      const x = ((answerCol + 0.5) * size) / side - frame.scrollLeft;
      marker.style.transform = `translateX(${x}px)`;
      marker.style.visibility = x >= 0 && x <= width ? "visible" : "hidden";
    }
  }, [size, side, answerCol]);
  const drawRef = useRef(draw);
  useLayoutEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  // The one-pixel-per-cell image, kept offscreen: filled from the bytes once, and again when the theme changes.
  useEffect(() => {
    const image = document.createElement("canvas");
    image.width = side;
    image.height = side;
    const imageContext = image.getContext("2d");
    if (!imageContext) return;
    const pixels = imageContext.createImageData(side, side);
    const fill = () => {
      fillGrid(cells, themeScale(), pixels.data);
      imageContext.putImageData(pixels, 0, 0);
      imageRef.current = image;
      drawRef.current();
    };
    fill();
    const theme = new MutationObserver(fill);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => theme.disconnect();
  }, [cells, side]);

  // The dimming layer, one pixel per column, and how dimmed each column is on the screen now (0 lit to 1 dimmed).
  const levels = useRef<Float32Array | null>(null);
  const dim = useRef<{ canvas: HTMLCanvasElement; context: CanvasRenderingContext2D; pixels: ImageData } | null>(null);
  const paintDim = useCallback(() => {
    const row = dim.current;
    if (!row || !levels.current) return;
    fillDimRow(levels.current, themeVeil(), row.pixels.data);
    row.context.putImageData(row.pixels, 0, 0);
    dimRef.current = row.canvas;
    drawRef.current();
  }, []);

  // A new mask (a step change): fade the levels from what is on the screen to the mask, or switch at once without `fade`.
  useEffect(() => {
    if (!mask) {
      levels.current = null;
      dimRef.current = null;
      drawRef.current();
      return;
    }
    if (!dim.current || dim.current.canvas.width !== mask.length) {
      const canvas = document.createElement("canvas");
      canvas.width = mask.length;
      canvas.height = 1;
      const context = canvas.getContext("2d");
      if (!context) return;
      dim.current = { canvas, context, pixels: context.createImageData(mask.length, 1) };
    }
    if (!levels.current || levels.current.length !== mask.length) levels.current = new Float32Array(mask.length);
    const shown = levels.current;
    const from = shown.slice();
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = fade ? fadeProgress(now - start) : 1;
      mixLevels(from, mask, t, shown);
      paintDim();
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    tick(start);
    // A fade cut short leaves the levels part way; the next one starts from there.
    return () => cancelAnimationFrame(frame);
  }, [mask, fade, paintDim]);

  // A theme change repaints the row in the new background colour, at the levels on the screen.
  useEffect(() => {
    const theme = new MutationObserver(paintDim);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => theme.disconnect();
  }, [paintDim]);

  // The frame is as wide as the content column, and square.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const resize = new ResizeObserver(() => {
      setFitWidth(box.clientWidth);
      drawRef.current();
    });
    resize.observe(box);
    return () => resize.disconnect();
  }, []);

  // After a zoom change, scroll so the view's centre stays where it was; then draw.
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (frame && centre.current && size > 0) {
      frame.scrollLeft = centre.current.x * size - frame.clientWidth / 2;
      frame.scrollTop = centre.current.y * size - frame.clientHeight / 2;
      centre.current = null;
    }
    draw();
  }, [draw, size]);

  const setZoom = (next: Zoom) => {
    const frame = frameRef.current;
    if (frame && size > 0) {
      centre.current = { x: (frame.scrollLeft + frame.clientWidth / 2) / size, y: (frame.scrollTop + frame.clientHeight / 2) / size };
    }
    setHover(null);
    setZoomText(next);
  };

  /** The cell under a point on the screen, or null off the grid or over the frame's scrollbars. */
  const cellUnder = (clientX: number, clientY: number): Cell | null => {
    const frame = frameRef.current;
    const grid = gridRef.current;
    if (!frame || !grid) return null;
    const view = frame.getBoundingClientRect();
    if (clientX - view.left >= frame.clientWidth || clientY - view.top >= frame.clientHeight) return null;
    const at = grid.getBoundingClientRect();
    return cellAt(clientX - at.left, clientY - at.top, fitWidth, zoom, side);
  };
  const point = (cell: Cell | null) => setHover((was) => (was && cell && was.row === cell.row && was.col === cell.col ? was : cell));
  const track = (e: React.PointerEvent) => {
    pointer.current = { x: e.clientX, y: e.clientY, mouse: e.pointerType === "mouse" };
  };

  const onScroll = () => {
    requestAnimationFrame(() => drawRef.current());
    const last = pointer.current;
    if (last?.mouse) point(cellUnder(last.x, last.y));
    else setHover(null);
  };

  // The card's anchor: the hovered cell's box on the screen, read when the card is placed.
  const anchor = useMemo(
    () => ({
      current: {
        getBoundingClientRect: () => {
          const at = gridRef.current?.getBoundingClientRect();
          if (!hover || !at) return new DOMRect();
          const rect = cellRect(hover, fitWidth, zoom, side);
          return new DOMRect(at.left + rect.x, at.top + rect.y, rect.size, rect.size);
        },
      },
    }),
    [hover, fitWidth, zoom, side],
  );

  const box = hover ? cellRect(hover, fitWidth, zoom, side) : null;
  // The outline round the hovered cell: at least 5 px, so it shows when a cell is under a pixel.
  const outline = box ? Math.max(box.size, 5) : 0;
  const guess = hover ? answers[hover.row] : "";
  const answer = hover ? answers[hover.col] : "";
  const marks = hover ? marksOfCode(cells[hover.row * side + hover.col]) : "";

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span id={zoomLabelId} className={FIELD_LABEL}>
          {text.matrixZoom}
        </span>
        <SegmentedControl labelledBy={zoomLabelId} value={zoom} onChange={setZoom} options={ZOOMS} names={{ fit: text.matrixZoomFit, ...ZOOM_NAMES }} />
      </div>
      {layer && (
        // The Answer's column: a marker above the frame, moved to the column (less the scroll) at each draw.
        <div className="relative -mb-1 h-2.5 w-full overflow-hidden" role="img" aria-label={text.matrixAnswerColumn(layer.answer)}>
          <div
            ref={markerRef}
            className="absolute top-0 left-0 -ml-[5px] h-0 w-0 border-x-[5px] border-t-[8px] border-x-transparent"
            style={{ borderTopColor: "var(--accent)", visibility: "hidden" }}
            aria-hidden
          />
        </div>
      )}
      <div ref={boxRef} className="relative aspect-square w-full max-w-full bg-overlay">
        <canvas ref={canvasRef} role="img" aria-label={label} className="absolute top-0 left-0 block" />
        <div
          ref={frameRef}
          className="absolute inset-0 overflow-auto overscroll-contain"
          tabIndex={zoomed ? 0 : undefined}
          role={zoomed ? "region" : undefined}
          aria-label={zoomed ? text.matrixScroll : undefined}
          onScroll={onScroll}
          onPointerDown={track}
          onPointerMove={(e) => {
            track(e);
            if (e.pointerType === "mouse") point(cellUnder(e.clientX, e.clientY));
          }}
          onPointerLeave={(e) => {
            if (e.pointerType !== "mouse") return;
            pointer.current = null;
            setHover(null);
          }}
          onClick={(e) => {
            // A tap (a click with no pan) shows the cell tapped; a mouse already shows the cell under it.
            if (pointer.current && !pointer.current.mouse) point(cellUnder(e.clientX, e.clientY));
          }}
        >
          <div ref={gridRef} className="relative" style={{ width: size, height: size }}>
            {layer?.rows.map(({ row, current }) => {
              const rect = cellRect({ row, col: 0 }, fitWidth, zoom, side);
              // At least 3 px tall, so a row shows when it is under a pixel.
              const tall = Math.max(rect.size, 3);
              return (
                <div
                  key={row}
                  className="pointer-events-none absolute left-0"
                  style={{
                    top: rect.y + rect.size / 2 - tall / 2,
                    width: size,
                    height: tall,
                    boxShadow: `0 0 0 1px var(--background), 0 0 0 2px ${current ? "var(--accent)" : "var(--text)"}`,
                  }}
                  aria-hidden
                />
              );
            })}
            {box && (
              <div
                className="pointer-events-none absolute rounded-[1px]"
                style={{
                  left: box.x + box.size / 2 - outline / 2,
                  top: box.y + box.size / 2 - outline / 2,
                  width: outline,
                  height: outline,
                  boxShadow: "0 0 0 1px var(--background), 0 0 0 2px var(--text)",
                }}
                aria-hidden
              />
            )}
          </div>
        </div>
        <Popover.Root open={hover !== null} onOpenChange={(open) => !open && setHover(null)}>
          <Popover.Anchor virtualRef={anchor} />
          <Popover.Portal>
            <Popover.Content
              side="top"
              sideOffset={6}
              collisionPadding={20}
              aria-label={hover ? text.matrixCell(guess, answer, marks) : undefined}
              className={`${CARD} pointer-events-none`}
              onOpenAutoFocus={(e) => e.preventDefault()}
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              {hover && <CellCard guess={guess} answer={answer} marks={marks} lang={lang} />}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </div>
  );
}

/** The hover card: the Guess as Tiles painted with the Feedback, the Answer, and the Feedback's Marks as digits. */
function CellCard({ guess, answer, marks, lang }: { guess: string; answer: string; marks: string; lang: Language }) {
  const text = pageText(lang);
  return (
    <div className="grid grid-cols-[auto_auto] items-center gap-x-3 gap-y-1.5">
      <span className="text-xs text-meta">{text.matrixGuess}</span>
      <span className="flex gap-0.5">
        {[...guess].map((letter, i) => (
          <Tile key={i} small letter={letter} mark={Number(marks[i]) as Mark} />
        ))}
      </span>
      <span className="text-xs text-meta">{text.answerLabel}</span>
      <span className="font-tile text-sm font-bold tracking-[0.35em] uppercase">{answer}</span>
      <span className="text-xs text-meta">{text.feedbackLabel}</span>
      <span className="font-mono text-xs text-meta tabular-nums">{marks}</span>
    </div>
  );
}

/** The scale as a bar in the same theme roles, with three Feedbacks as Tiles under it: all Absent, all Present, the Win. */
function Legend({ lang }: { lang: Language }) {
  const text = pageText(lang);
  return (
    <figure className="grid gap-2" aria-label={text.matrixLegend}>
      <figcaption className="text-xs text-meta">{text.matrixLegend}</figcaption>
      <div
        className="h-3 w-full rounded-sm"
        style={{ background: `linear-gradient(to right, ${SCALE_ROLES.map((role) => `var(${role})`).join(", ")})` }}
        aria-hidden
      />
      <div className="flex justify-between gap-2">
        {LEGEND_CODES.map((code, i) => {
          const marks = marksOfCode(code);
          return (
            <div key={code} className={`flex flex-col gap-1 ${i === 0 ? "items-start" : i === LEGEND_CODES.length - 1 ? "items-end" : "items-center"}`}>
              <span className="flex gap-0.5" role="img" aria-label={`${text.feedbackLabel} ${marks}`}>
                {[...marks].map((m, j) => (
                  <Tile key={j} tiny letter="" mark={Number(m) as Mark} />
                ))}
              </span>
              <span className="font-mono text-xs text-meta tabular-nums">{code}</span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}
