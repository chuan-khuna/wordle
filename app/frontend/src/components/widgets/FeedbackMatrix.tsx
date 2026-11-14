"use client";

import { Popover } from "radix-ui";
import { Suspense, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FIELD_LABEL } from "@/components/controls/Field";
import { SegmentedControl } from "@/components/controls/SegmentedControl";
import { getFeedbackMatrix } from "@/lib/api";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";
import { pageText } from "@/lib/i18n/page-text";
import {
  type Cell,
  LEGEND_CODES,
  SCALE_ROLES,
  type Rgb,
  ZOOMS,
  type Zoom,
  buildScale,
  cellAt,
  cellRect,
  fillGrid,
  gridSize,
  marksOfCode,
  parseHex,
  parseZoom,
} from "@/lib/widgets/matrix-grid";
import type { Mark } from "@/lib/wordle/feedback";
import { Tile } from "./_components/Tile";
import { WidgetFrame } from "./_components/ui";
import { CARD } from "./_components/useHoverCard";
import { useLoad } from "./_components/useLoad";
import { useWidgetParam } from "./_components/useWidgetParam";

/** Grey, if a theme role cannot be read (it always can in the ten themes). */
const FALLBACK: Rgb = [128, 128, 128];

/** The scale's colours from the theme roles on `<html>` (set by `data-theme`). */
function themeScale(): Uint8ClampedArray {
  const style = getComputedStyle(document.documentElement);
  return buildScale(SCALE_ROLES.map((role) => parseHex(style.getPropertyValue(role)) ?? FALLBACK));
}

/**
 * The Answer × Answer Feedback Matrix on a canvas: one cell per (Guess, Answer) pair, rows Guesses and columns Answers,
 * both in Answer List order (`answers`, the build-time list, sorted as the backend's matrix is), so the Wins are the
 * diagonal. The bytes come from `GET /api/feedback-matrix`. They are painted once into a one-pixel-per-cell image (an
 * offscreen canvas), which is drawn scaled to the visible canvas with smoothing off; a theme change refills the image,
 * a resize or a scroll only redraws it. Zoom (fit, 2×, 4×, 8×; the `zoom` URL param) and the hover card are in `Grid`.
 */
export function FeedbackMatrix({ answers, lang = DEFAULT_LANGUAGE }: { answers: readonly string[]; lang?: Language }) {
  const text = pageText(lang);
  const { data, error } = useLoad("feedback-matrix", getFeedbackMatrix);
  const side = answers.length;
  const wrongSize = data !== null && data.length !== side * side;
  const cells = data !== null && !wrongSize ? data : null;

  return (
    <WidgetFrame title={text.matrixFigure}>
      <div className="grid gap-3">
        <p className="text-xs text-meta">{text.matrixAxes(answers[0] ?? "", answers[side - 1] ?? "", side.toLocaleString("en-US"))}</p>
        {error ? (
          <p className="text-sm text-error">{error}</p>
        ) : wrongSize ? (
          <p className="text-sm text-error">{text.matrixWrongSize}</p>
        ) : cells ? (
          <Suspense fallback={<div className="aspect-square w-full bg-overlay" />}>
            <Grid cells={cells} answers={answers} label={text.matrixLabel(side.toLocaleString("en-US"))} lang={lang} />
          </Suspense>
        ) : (
          <div className="grid aspect-square w-full place-items-center bg-overlay text-sm text-meta">{text.matrixLoading}</div>
        )}
        <Legend lang={lang} />
      </div>
    </WidgetFrame>
  );
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
 */
function Grid({ cells, answers, label, lang }: { cells: Uint8Array; answers: readonly string[]; label: string; lang: Language }) {
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
  // The frame's width (CSS px): the grid's side at `fit`, which the zoom levels multiply.
  const [fitWidth, setFitWidth] = useState(0);
  const [hover, setHover] = useState<Cell | null>(null);
  // So a scroll under a resting mouse moves the card to the cell now under it.
  const pointer = useRef<Pointer | null>(null);
  // The view's centre as a fraction of the grid, kept across a zoom change.
  const centre = useRef<{ x: number; y: number } | null>(null);
  const size = gridSize(fitWidth, zoom);

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
  }, [size]);
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
