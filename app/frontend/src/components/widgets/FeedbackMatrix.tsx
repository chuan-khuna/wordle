"use client";

import { RotateCcw } from "lucide-react";
import { Popover } from "radix-ui";
import { Fragment, Suspense, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ControlPanel } from "@/components/controls/ControlPanel";
import { FIELD_LABEL } from "@/components/controls/Field";
import { SegmentedControl } from "@/components/controls/SegmentedControl";
import { Button } from "@/components/ui/button";
import { type SolveResponse, getFeedbackMatrix, postCandidates } from "@/lib/api";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";
import { pageText } from "@/lib/i18n/page-text";
import {
  CANDIDATE_ROLES,
  CENTRE_PARAM_DEFAULT,
  type Cell,
  FIT,
  LEGEND_CODES,
  PLAY_STEP_MS,
  SCALE_ROLES,
  type Rgb,
  type Viewport,
  ZOOM_PARAM_DEFAULT,
  answerIndex,
  axisTicks,
  buildScale,
  cellAt,
  cellRect,
  clampViewport,
  dimmedMask,
  fadeProgress,
  fillCandidateRow,
  fillDimRow,
  fillGrid,
  gridBox,
  guessRows,
  letterSpans,
  marksOfCode,
  maxZoom,
  mixLevels,
  panBy,
  parseHex,
  parseViewport,
  playNext,
  playStart,
  sizesPerStep,
  stateKey,
  statesPerStep,
  viewportParams,
  visibleCells,
  zoomAround,
} from "@/lib/widgets/matrix-grid";
import type { Mark } from "@/lib/wordle/feedback";
import { GuessStrip } from "./_components/GuessStrip";
import { GameInputs, useSolverGame } from "./_components/SolverGame";
import { Tile } from "./_components/Tile";
import { WidgetFrame } from "./_components/ui";
import { CARD } from "./_components/useHoverCard";
import { useLoad } from "./_components/useLoad";
import { useReducedMotion } from "./_components/useReducedMotion";
import { useParamInitial, useParamSync, useWidgetParam } from "./_components/useWidgetParam";

/** Grey, if a theme role cannot be read (it always can in the ten themes). */
const FALLBACK: Rgb = [128, 128, 128];

/** The scale's colours from the theme roles on `<html>` (set by `data-theme`). */
function themeScale(): Uint8ClampedArray {
  const style = getComputedStyle(document.documentElement);
  return buildScale(SCALE_ROLES.map((role) => parseHex(style.getPropertyValue(role)) ?? FALLBACK));
}

/** A theme role's colour, read from `<html>` (set by `data-theme`). */
function themeColour(role: string): Rgb {
  return parseHex(getComputedStyle(document.documentElement).getPropertyValue(role)) ?? FALLBACK;
}

/** What the cells are coloured by: their Feedback Code (the Feedback view), or only whether their column is still a Candidate (the Candidate view). */
const MODES = ["feedback", "candidates"] as const;
type Mode = (typeof MODES)[number];

/**
 * The Feedback Matrix page's content: the Solver's Game (`GameInputs`, the URL params `answer`, `pool`, `scope`,
 * `by`, `opener`, and `step`, 0 before any Guess), a sticky strip of its Guesses with the Candidate Set's size at
 * each step, and the Answer × Answer Feedback Matrix on a canvas with the columns no longer Candidates dimmed.
 * One cell per (Guess, Answer) pair, rows Guesses and columns Answers, both in Answer List order (`answers`, the
 * build-time list, sorted as the backend's matrix is), so the Wins are the diagonal. The bytes come from
 * `GET /api/feedback-matrix`. They are painted once into a one-pixel-per-cell image (an offscreen canvas), which is
 * drawn scaled to the visible canvas with smoothing off; a theme change refills the image, a zoom, a pan or a resize
 * only redraws it. The view (`view=candidates` for the Candidate view) is chosen here, for the legend; the zoom and
 * pan (the `zoom` and `centre` URL params), the a–z ticks, the dimming layer and the hover card are in `Grid`.
 */
export function FeedbackMatrix({ answers, lang = DEFAULT_LANGUAGE }: { answers: readonly string[]; lang?: Language }) {
  return (
    <Suspense fallback={<div className="h-64 w-full bg-overlay" />}>
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
  const [modeText, setModeText] = useWidgetParam(undefined, "view", "feedback");
  const mode: Mode = modeText === "candidates" ? "candidates" : "feedback";
  // The strip's element, so the grid fits the viewport below it.
  const stripId = useId();

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
          id={stripId}
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
            <Grid
              cells={cells}
              answers={answers}
              layer={layer}
              fade={!reducedMotion}
              mode={mode}
              setMode={setModeText}
              stripId={shown ? stripId : undefined}
              label={text.matrixLabel(side.toLocaleString("en-US"))}
              lang={lang}
            />
          ) : (
            <div className="grid h-64 w-full place-items-center bg-overlay text-sm text-meta">{text.matrixLoading}</div>
          )}
          <Legend mode={mode} lang={lang} />
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

/** The x axis's strip above the frame (letters, ticks and the Answer marker) and the y axis's strip left of it, in CSS px. */
const AXIS_X = 24;
const AXIS_Y = 18;
/** Room the grid leaves below the viewport's height for the gaps around it, in CSS px. */
const SLACK = 32;
/** The smallest the grid gets when the viewport is short (a phone held sideways); the content width still caps it. */
const MIN_FIT = 200;
/** The least room, in CSS px, between two letters' labels on the x and the y axis. */
const LABEL_GAP_X = 12;
const LABEL_GAP_Y = 16;
/** How far a pointer moves before a press is a drag, not a click or a tap, in CSS px. */
const DRAG_PX = 4;
/** One `+` or `-` key: the zoom factor. One arrow key: the share of the frame it pans. */
const KEY_ZOOM = 1.5;
const KEY_PAN = 0.1;
/** How long the zoom and centre wait before going to the URL, so a drag or a wheel spin writes it once. */
const URL_DELAY_MS = 300;

/** Where the pointer last was over the frame, and whether it is a mouse (a touch or a pen taps instead of hovering). */
type Pointer = { x: number; y: number; mouse: boolean };

/**
 * The grid in a square frame that fits the page: its side is the smaller of the content width (less the y axis) and the
 * viewport's height less the sticky Guess strip, the toolbar and the x axis, so the whole grid is in view and nothing
 * scrolls. At fit (zoom 1) the whole grid fills the frame; the wheel (desktop) or a pinch (phone) zooms around the
 * pointer, a drag pans, and the view never shows past the grid's edges (`clampViewport`). Reset and a double-click go
 * back to fit; with the focus on the frame, `+` / `-` zoom, the arrow keys pan and `0` fits. The zoom and centre go to the
 * URL (`zoom`, `centre`) once they settle. The visible canvas is only the frame's size: each draw copies the cells in
 * view from the one-pixel-per-cell image, scaled, with smoothing off, so cells stay crisp at every zoom.
 *
 * The a–z ticks on both axes mark where each first letter's words begin (`axisTicks`), and follow the zoom and pan.
 * Hovering (or tapping) a cell outlines it and shows its Guess, Answer and Feedback in a card.
 *
 * The Game (`layer`) is drawn over the grid without touching its image: a second offscreen image, one pixel per column,
 * drawn stretched over the grid with the same mapping. In the Feedback view it is a veil over each column no longer a
 * Candidate (`fillDimRow`); in the Candidate view it replaces the Feedback colours, a Candidate's column blue and the
 * rest grey (`fillCandidateRow`), so switching the view refills 2,315 pixels, not 5.4 million. The rows of the Guesses
 * played are outlined, and a marker on the x axis points at the Answer's column.
 *
 * With `fade`, a new mask does not switch the columns at once: each animation frame for `FADE_MS` mixes the levels on
 * the screen towards the new mask (`mixLevels`, eased by `fadeProgress`), refills the one-row image and redraws, in
 * either view. Without `fade` (`prefers-reduced-motion`) the new mask shows at once.
 */
function Grid({
  cells,
  answers,
  layer,
  fade,
  mode,
  setMode,
  stripId,
  label,
  lang,
}: {
  cells: Uint8Array;
  answers: readonly string[];
  layer: GameLayer | null;
  fade: boolean;
  mode: Mode;
  setMode: (mode: Mode) => void;
  stripId: string | undefined;
  label: string;
  lang: Language;
}) {
  const text = pageText(lang);
  const side = answers.length;
  const spans = useMemo(() => letterSpans(answers), [answers]);
  const modeLabelId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLCanvasElement | null>(null);
  const rowRef = useRef<HTMLCanvasElement | null>(null);
  // The frame's side in CSS px: the grid's side at fit.
  const [fit, setFit] = useState(0);
  const max = maxZoom(fit, side);
  // The viewport asked for (from the URL, then by the reader); `view` is what the frame can show of it.
  const zoomParam = useParamInitial(undefined, "zoom", ZOOM_PARAM_DEFAULT);
  const centreParam = useParamInitial(undefined, "centre", CENTRE_PARAM_DEFAULT);
  const [wanted, setWanted] = useState<Viewport>(() => parseViewport(zoomParam, centreParam));
  const view = useMemo(() => clampViewport(wanted, max), [wanted, max]);
  const [hover, setHover] = useState<Cell | null>(null);
  // So a zoom or pan under a resting mouse moves the card to the cell now under it.
  const pointer = useRef<Pointer | null>(null);
  // The pointers down on the frame (client px), the one-pointer drag, and the two-pointer pinch.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const pinch = useRef<{ dist: number; mid: { x: number; y: number }; view: Viewport } | null>(null);
  // The view, fit and most zoom the event handlers start from (a wheel or a drag can fire twice before a render).
  const live = useRef({ view, fit, max });
  useLayoutEffect(() => {
    live.current = { view, fit, max };
  }, [view, fit, max]);
  const modeRef = useRef(mode);

  // The zoom and centre go to the URL once they have settled.
  const [saved, setSaved] = useState(wanted);
  useEffect(() => {
    if (fit <= 0) return;
    const timer = window.setTimeout(() => setSaved(view), URL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [view, fit]);
  const params = viewportParams(saved);
  useParamSync(undefined, "zoom", params.zoom, ZOOM_PARAM_DEFAULT);
  useParamSync(undefined, "centre", params.centre, CENTRE_PARAM_DEFAULT);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || fit <= 0) return;
    const ratio = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(fit * ratio));
    if (canvas.width !== w || canvas.height !== w) {
      canvas.width = w;
      canvas.height = w;
    }
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, w, w);
    context.imageSmoothingEnabled = false;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    // Only the cells in view, copied from the one-pixel-per-cell images to where they fall in the frame.
    const { left, top, size } = gridBox(view, fit);
    const step = size / side;
    const { col0, col1, row0, row1 } = visibleCells(view, fit, side);
    if (col1 <= col0 || row1 <= row0) return;
    const x = left + col0 * step;
    const y = top + row0 * step;
    const width = (col1 - col0) * step;
    const height = (row1 - row0) * step;
    if (mode === "feedback" && imageRef.current) context.drawImage(imageRef.current, col0, row0, col1 - col0, row1 - row0, x, y, width, height);
    if (rowRef.current) context.drawImage(rowRef.current, col0, 0, col1 - col0, 1, x, y, width, height);
  }, [view, fit, side, mode]);
  const drawRef = useRef(draw);
  useLayoutEffect(() => {
    drawRef.current = draw;
    modeRef.current = mode;
    draw();
  }, [draw, mode]);

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

  // The one-row layer, one pixel per column, and how dimmed each column is on the screen now (0 lit to 1 dimmed).
  const levels = useRef<Float32Array | null>(null);
  const row = useRef<{ canvas: HTMLCanvasElement; context: CanvasRenderingContext2D; pixels: ImageData } | null>(null);
  const paintRow = useCallback(() => {
    if (!row.current || row.current.canvas.width !== side) {
      const canvas = document.createElement("canvas");
      canvas.width = side;
      canvas.height = 1;
      const context = canvas.getContext("2d");
      if (!context) return;
      row.current = { canvas, context, pixels: context.createImageData(side, 1) };
    }
    if (!levels.current || levels.current.length !== side) levels.current = new Float32Array(side);
    const { canvas, context, pixels } = row.current;
    if (modeRef.current === "candidates") fillCandidateRow(levels.current, themeColour(CANDIDATE_ROLES[0]), themeColour(CANDIDATE_ROLES[1]), pixels.data);
    else fillDimRow(levels.current, themeColour("--background"), pixels.data);
    context.putImageData(pixels, 0, 0);
    rowRef.current = canvas;
    drawRef.current();
  }, [side]);

  // A new mask (a step change): fade the levels from what is on the screen to the mask, or switch at once without
  // `fade`. No Game yet: every column lit.
  const mask = layer?.mask ?? null;
  useEffect(() => {
    const target = mask ?? new Uint8Array(side);
    if (!levels.current || levels.current.length !== target.length) levels.current = new Float32Array(target.length);
    const shown = levels.current;
    const from = shown.slice();
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = fade ? fadeProgress(now - start) : 1;
      mixLevels(from, target, t, shown);
      paintRow();
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    tick(start);
    // A fade cut short leaves the levels part way; the next one starts from there.
    return () => cancelAnimationFrame(frame);
  }, [mask, side, fade, paintRow]);

  // Switching the view repaints the one-row layer only (the grid image is kept); a theme change repaints it too.
  useEffect(() => {
    paintRow();
  }, [mode, paintRow]);
  useEffect(() => {
    const theme = new MutationObserver(paintRow);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => theme.disconnect();
  }, [paintRow]);

  // The frame's side: the content width less the y axis, or the viewport's height less the sticky strip, the toolbar
  // and the x axis, whichever is smaller.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const strip = stripId ? document.getElementById(stripId) : null;
    const measure = () => {
      const width = box.clientWidth - AXIS_Y;
      const height = window.innerHeight - (strip?.offsetHeight ?? 0) - (toolbarRef.current?.offsetHeight ?? 0) - AXIS_X - SLACK;
      setFit(Math.max(0, Math.floor(Math.min(width, Math.max(height, MIN_FIT)))));
    };
    const resize = new ResizeObserver(measure);
    resize.observe(box);
    if (strip) resize.observe(strip);
    if (toolbarRef.current) resize.observe(toolbarRef.current);
    window.addEventListener("resize", measure);
    return () => {
      resize.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [stripId]);

  /** A point on the screen in CSS px from the frame's top-left corner. */
  const local = (clientX: number, clientY: number) => {
    const at = frameRef.current?.getBoundingClientRect();
    return { x: clientX - (at?.left ?? 0), y: clientY - (at?.top ?? 0) };
  };
  /** The cell under a point on the screen at `view` (the one shown, by default), or null outside the frame or off the grid. */
  const cellUnder = (clientX: number, clientY: number, at: Viewport = live.current.view): Cell | null => {
    const p = local(clientX, clientY);
    return cellAt(p.x, p.y, at, live.current.fit, side);
  };
  const point = (cell: Cell | null) => setHover((was) => (was && cell && was.row === cell.row && was.col === cell.col ? was : cell));
  const track = (e: React.PointerEvent) => {
    pointer.current = { x: e.clientX, y: e.clientY, mouse: e.pointerType === "mouse" };
  };

  /** Move the view (from the one on the screen), then show the cell now under a resting mouse; a touch's card closes. */
  const change = (next: (view: Viewport, fit: number, max: number) => Viewport) => {
    const now = live.current;
    const moved = next(now.view, now.fit, now.max);
    live.current = { ...now, view: moved };
    setWanted(moved);
    const last = pointer.current;
    if (last?.mouse && !drag.current?.moved) point(cellUnder(last.x, last.y, moved));
    else setHover(null);
  };
  const changeRef = useRef(change);
  useLayoutEffect(() => {
    changeRef.current = change;
  });

  // The wheel zooms around the pointer (a trackpad pinch is a wheel with Ctrl, so it zooms faster). The listener is
  // not passive, so the page does not scroll under it; zooming out at fit lets the wheel scroll the page instead.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const onWheel = (e: WheelEvent) => {
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      const dy = e.deltaY * unit;
      if (dy === 0 || (dy > 0 && live.current.view.zoom <= 1)) return;
      e.preventDefault();
      const factor = Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.002));
      const at = frame.getBoundingClientRect();
      const x = e.clientX - at.left;
      const y = e.clientY - at.top;
      changeRef.current((v, f, m) => zoomAround(v, factor, x, y, f, m));
    };
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, []);

  const startPinch = () => {
    const [a, b] = [...pointers.current.values()];
    pinch.current = { dist: Math.hypot(b.x - a.x, b.y - a.y) || 1, mid: local((a.x + b.x) / 2, (a.y + b.y) / 2), view: live.current.view };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    track(e);
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // So a drag keeps its pointer when it leaves the frame (a pointer the browser no longer tracks cannot be captured).
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) drag.current = { x: e.clientX, y: e.clientY, moved: false };
    else if (pointers.current.size === 2) {
      // A second finger: a pinch, never a tap.
      startPinch();
      if (drag.current) drag.current.moved = true;
      setHover(null);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    track(e);
    const down = pointers.current;
    if (down.has(e.pointerId)) {
      down.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const start = pinch.current;
      if (down.size >= 2 && start) {
        // Zoom by how far the fingers spread, around where they started, and pan by how far their middle moved.
        const [a, b] = [...down.values()];
        const factor = Math.hypot(b.x - a.x, b.y - a.y) / start.dist;
        const mid = local((a.x + b.x) / 2, (a.y + b.y) / 2);
        change((_, f, m) => panBy(zoomAround(start.view, factor, start.mid.x, start.mid.y, f, m), mid.x - start.mid.x, mid.y - start.mid.y, f, m));
        return;
      }
      const d = drag.current;
      if (d) {
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        if (!d.moved && Math.hypot(dx, dy) < DRAG_PX) return;
        drag.current = { x: e.clientX, y: e.clientY, moved: true };
        change((v, f, m) => panBy(v, dx, dy, f, m));
        return;
      }
    }
    if (e.pointerType === "mouse") point(cellUnder(e.clientX, e.clientY));
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const down = pointers.current;
    if (!down.delete(e.pointerId)) return;
    const d = drag.current;
    if (down.size === 0) {
      drag.current = null;
      pinch.current = null;
      // A mouse shows the cell under it again after a drag; a tap (a press with no drag) shows the cell tapped.
      if (e.type === "pointerup" && (e.pointerType === "mouse" || !d?.moved)) point(cellUnder(e.clientX, e.clientY));
    } else if (down.size === 1) {
      // A pinch with one finger lifted carries on as a drag from the finger left.
      const [only] = [...down.values()];
      drag.current = { ...only, moved: true };
      pinch.current = null;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const zoomed = live.current.view.zoom > 1;
    const step = live.current.fit * KEY_PAN;
    const pans: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (e.key === "+" || e.key === "=") change((v, f, m) => zoomAround(v, KEY_ZOOM, f / 2, f / 2, f, m));
    else if (e.key === "-" || e.key === "_") change((v, f, m) => zoomAround(v, 1 / KEY_ZOOM, f / 2, f / 2, f, m));
    else if (e.key === "0") change(() => FIT);
    else if (e.key in pans && zoomed) change((v, f, m) => panBy(v, pans[e.key][0], pans[e.key][1], f, m));
    else if (e.key === "Escape") return setHover(null);
    else return;
    e.preventDefault();
  };

  // The card's anchor: the hovered cell's box on the screen, read when the card is placed.
  const anchor = useMemo(
    () => ({
      current: {
        getBoundingClientRect: () => {
          const at = frameRef.current?.getBoundingClientRect();
          if (!hover || !at) return new DOMRect();
          const rect = cellRect(hover, view, fit, side);
          return new DOMRect(at.left + rect.x, at.top + rect.y, rect.size, rect.size);
        },
      },
    }),
    [hover, view, fit, side],
  );

  const box = gridBox(view, fit);
  const xTicks = axisTicks(spans, box.left, box.size, side, fit, LABEL_GAP_X);
  const yTicks = axisTicks(spans, box.top, box.size, side, fit, LABEL_GAP_Y);
  const hovered = hover ? cellRect(hover, view, fit, side) : null;
  // The outline round the hovered cell: at least 5 px, so it shows when a cell is under a pixel.
  const outline = hovered ? Math.max(hovered.size, 5) : 0;
  const guess = hover ? answers[hover.row] : "";
  const answer = hover ? answers[hover.col] : "";
  const marks = hover ? marksOfCode(cells[hover.row * side + hover.col]) : "";
  const marker = layer && layer.answerCol >= 0 ? cellRect({ row: 0, col: layer.answerCol }, view, fit, side) : null;
  const markerX = marker ? marker.x + marker.size / 2 : -1;
  const zoomText = view.zoom < 10 ? view.zoom.toFixed(1) : view.zoom.toFixed(0);

  return (
    <div ref={boxRef} className="grid min-w-0 gap-2">
      <div ref={toolbarRef} className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="flex items-center gap-2">
          <span id={modeLabelId} className={FIELD_LABEL}>
            {text.matrixView}
          </span>
          <SegmentedControl labelledBy={modeLabelId} value={mode} onChange={setMode} options={MODES} names={{ feedback: text.matrixViewFeedback, candidates: text.matrixViewCandidates }} />
        </span>
        <span className="flex items-center gap-2">
          <Button size="sm" disabled={view.zoom <= 1} onClick={() => change(() => FIT)}>
            <RotateCcw aria-hidden />
            {text.matrixReset}
          </Button>
          <span className="text-xs text-meta tabular-nums">{text.matrixZoomLevel(zoomText)}</span>
        </span>
        <span className="text-xs text-meta">{text.matrixZoomHint}</span>
      </div>
      <div className="grid" style={{ gridTemplateColumns: `${AXIS_Y}px ${fit}px`, gridTemplateRows: `${AXIS_X}px ${fit}px` }}>
        <div />
        {/* The x axis: a letter over each first letter's span, a tick where it begins, and the Answer's column marker. */}
        <div className="relative overflow-hidden">
          <div aria-hidden>
            {xTicks.map((t) => (
              <Fragment key={t.letter}>
                {t.at !== null && <span className="absolute bottom-0 h-1.5 w-px bg-muted" style={{ left: t.at }} />}
                {t.label !== null && (
                  <span className="absolute top-0 -translate-x-1/2 font-mono text-xs leading-none text-meta" style={{ left: t.label }}>
                    {t.letter}
                  </span>
                )}
              </Fragment>
            ))}
          </div>
          {layer && (
            <div
              role="img"
              aria-label={text.matrixAnswerColumn(layer.answer)}
              className="absolute bottom-0 -ml-[5px] h-0 w-0 border-x-[5px] border-t-[8px] border-x-transparent"
              style={{ left: markerX, borderTopColor: "var(--accent)", visibility: markerX >= 0 && markerX <= fit ? "visible" : "hidden" }}
            />
          )}
        </div>
        {/* The y axis, the same for the Guesses. */}
        <div className="relative overflow-hidden" aria-hidden>
          {yTicks.map((t) => (
            <Fragment key={t.letter}>
              {t.at !== null && <span className="absolute right-0 h-px w-1.5 bg-muted" style={{ top: t.at }} />}
              {t.label !== null && (
                <span className="absolute left-0 -translate-y-1/2 font-mono text-xs leading-none text-meta" style={{ top: t.label }}>
                  {t.letter}
                </span>
              )}
            </Fragment>
          ))}
        </div>
        <div
          ref={frameRef}
          tabIndex={0}
          role="region"
          aria-label={text.matrixPan}
          className={`relative overflow-hidden bg-overlay select-none ${view.zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-crosshair"}`}
          // Zoomed in, every gesture is the grid's; at fit a vertical swipe still scrolls the page.
          style={{ width: fit, height: fit, touchAction: view.zoom > 1 ? "none" : "pan-y" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          onPointerLeave={(e) => {
            if (e.pointerType !== "mouse" || drag.current) return;
            pointer.current = null;
            setHover(null);
          }}
          onDoubleClick={() => change(() => FIT)}
          onKeyDown={onKeyDown}
        >
          <canvas ref={canvasRef} role="img" aria-label={label} className="absolute top-0 left-0 block" style={{ width: fit, height: fit }} />
          {layer?.rows.map(({ row: r, current }) => {
            const rect = cellRect({ row: r, col: 0 }, view, fit, side);
            // At least 3 px tall, so a row shows when it is under a pixel.
            const tall = Math.max(rect.size, 3);
            const top = rect.y + rect.size / 2 - tall / 2;
            if (top > fit || top + tall < 0) return null;
            return (
              <div
                key={r}
                className="pointer-events-none absolute left-0"
                style={{
                  top,
                  width: fit,
                  height: tall,
                  boxShadow: `0 0 0 1px var(--background), 0 0 0 2px ${current ? "var(--accent)" : "var(--text)"}`,
                }}
                aria-hidden
              />
            );
          })}
          {hovered && (
            <div
              className="pointer-events-none absolute rounded-[1px]"
              style={{
                left: hovered.x + hovered.size / 2 - outline / 2,
                top: hovered.y + hovered.size / 2 - outline / 2,
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

/**
 * The legend for the view shown. The Feedback view: the scale as a bar in the same theme roles, with three Feedbacks as
 * Tiles under it (all Absent, all Present, the Win). The Candidate view: a swatch for a Candidate's column and one for
 * a column no longer a Candidate, in the same theme roles as the grid.
 */
function Legend({ mode, lang }: { mode: Mode; lang: Language }) {
  const text = pageText(lang);
  if (mode === "candidates") {
    return (
      <figure className="grid gap-2" aria-label={text.matrixCandidateLegend}>
        <figcaption className="text-xs text-meta">{text.matrixCandidateLegend}</figcaption>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-meta">
          {[
            [CANDIDATE_ROLES[0], text.matrixLegendCandidate],
            [CANDIDATE_ROLES[1], text.matrixLegendGone],
          ].map(([role, name]) => (
            <li key={role} className="flex items-center gap-2">
              <span className="size-3 rounded-xs" style={{ background: `var(${role})` }} aria-hidden />
              {name}
            </li>
          ))}
        </ul>
      </figure>
    );
  }
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
