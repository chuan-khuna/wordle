"use client";

import { useEffect, useRef } from "react";
import { getFeedbackMatrix } from "@/lib/api";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";
import { pageText } from "@/lib/i18n/page-text";
import { LEGEND_CODES, SCALE_ROLES, type Rgb, buildScale, fillGrid, marksOfCode, parseHex } from "@/lib/widgets/matrix-grid";
import type { Mark } from "@/lib/wordle/feedback";
import { Tile } from "./_components/Tile";
import { WidgetFrame } from "./_components/ui";
import { useLoad } from "./_components/useLoad";

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
 * a resize only redraws it.
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
          <Grid cells={cells} side={side} label={text.matrixLabel(side.toLocaleString("en-US"))} />
        ) : (
          <div className="grid aspect-square w-full place-items-center bg-overlay text-sm text-meta">{text.matrixLoading}</div>
        )}
        <Legend lang={lang} />
      </div>
    </WidgetFrame>
  );
}

function Grid({ cells, side, label }: { cells: Uint8Array; side: number; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // The one-pixel-per-cell image, kept offscreen.
    const image = document.createElement("canvas");
    image.width = side;
    image.height = side;
    const imageContext = image.getContext("2d");
    if (!imageContext) return;
    const pixels = imageContext.createImageData(side, side);

    const draw = () => {
      const size = Math.max(1, Math.round(canvas.clientWidth * window.devicePixelRatio));
      if (canvas.width !== size) canvas.width = canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, size, size);
      context.drawImage(image, 0, 0, size, size);
    };
    const fill = () => {
      fillGrid(cells, themeScale(), pixels.data);
      imageContext.putImageData(pixels, 0, 0);
      draw();
    };

    fill();
    const resize = new ResizeObserver(draw);
    resize.observe(canvas);
    const theme = new MutationObserver(fill);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      resize.disconnect();
      theme.disconnect();
    };
  }, [cells, side]);

  return <canvas ref={canvasRef} role="img" aria-label={label} className="block aspect-square w-full max-w-full bg-overlay" />;
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
