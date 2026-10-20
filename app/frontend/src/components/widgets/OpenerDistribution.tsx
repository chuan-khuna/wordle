"use client";

import { Suspense, useMemo } from "react";
import { type GuessCountOpener, type GuessCountsResponse, getGuessCounts } from "@/lib/api";
import { type Bar, groupOpeners } from "@/lib/opener-bars";
import { WidgetFrame } from "./ui";
import { useLoad } from "./useLoad";
import { useWidgetParam } from "./useWidgetParam";

const DEFAULT_STRATEGY = "bits-all";

// Chart geometry in SVG user units. Each bar is at least BAR_WIDTH wide, so a phone scrolls the frame sideways.
const BAR_WIDTH = 14;
const PLOT_HEIGHT = 320;
const MARGIN = { top: 12, right: 12, bottom: 44, left: 48 };

const ANSWER_FILL = "var(--correct)";
const OTHER_FILL = "var(--present)";

/** A round Y axis step that gives about five gridlines up to `max`. */
function tickStep(max: number): number {
  const rough = Math.max(max, 1) / 5;
  const power = 10 ** Math.floor(Math.log10(rough));
  return [1, 2, 5, 10].map((m) => m * power).find((s) => s >= rough) ?? power * 10;
}

/**
 * Widget 7: the Opener Distribution. Every Opener of one Strategy played out (the Guess Count Matrix) is one block,
 * stacked in a bar 0.01 wide by its Average Guess Count; the best-ranked Opener is at the bottom of each stack.
 * Blocks are coloured by Answer List membership. On a phone the chart scrolls sideways inside its frame.
 * Props: `strategy` (default `bits-all`), `id` (URL param `id.strategy`). The URL param `strategy` overrides the prop.
 */
export function OpenerDistribution(props: { strategy?: string; id?: string }) {
  return (
    <Suspense fallback={<WidgetFrame title="Opener Distribution">Loading…</WidgetFrame>}>
      <Distribution {...props} />
    </Suspense>
  );
}

function Distribution({ strategy: prop = DEFAULT_STRATEGY, id }: { strategy?: string; id?: string }) {
  const [strategy] = useWidgetParam(id, "strategy", prop);
  const { data, error, loading } = useLoad(`guess-counts:${strategy}`, (signal) => getGuessCounts(strategy, signal));

  return (
    <WidgetFrame title="Opener Distribution">
      <div aria-live="polite" className="min-h-6 text-sm">
        {loading && <p className="text-meta">Loading the Openers…</p>}
        {error && (
          <p role="alert" className="text-error">
            {error}
          </p>
        )}
      </div>
      {data && <Chart data={data} />}
    </WidgetFrame>
  );
}

function Chart({ data }: { data: GuessCountsResponse }) {
  const bars = useMemo(() => groupOpeners(data.openers), [data]);
  const partial = data.complete_rows < data.total_rows;

  return (
    <>
      <p className="mb-2 text-sm text-text">{data.strategy.name}</p>
      {partial && (
        <p className="mb-2 text-sm text-meta">
          {data.complete_rows.toLocaleString("en-US")} of {data.total_rows.toLocaleString("en-US")} Openers played
        </p>
      )}
      <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Colours">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-3 w-3 rounded-xs" style={{ background: ANSWER_FILL }} />
          On the Answer List
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-3 w-3 rounded-xs" style={{ background: OTHER_FILL }} />
          Not on the Answer List
        </li>
      </ul>
      {bars.length > 0 && <Bars bars={bars} />}
      <p className="mt-1 text-xs text-meta">
        Each block is one Opener, stacked by Average Guess Count (rounded to two decimals); the best-ranked is at the bottom of its bar.
      </p>
    </>
  );
}

function Bars({ bars }: { bars: Bar<GuessCountOpener>[] }) {
  const tallest = Math.max(...bars.map((b) => b.openers.length));
  const step = tickStep(tallest);
  const top = Math.ceil(tallest / step) * step;
  const unit = PLOT_HEIGHT / top;
  const plotWidth = bars.length * BAR_WIDTH;
  const width = MARGIN.left + plotWidth + MARGIN.right;
  const height = MARGIN.top + PLOT_HEIGHT + MARGIN.bottom;
  const floor = MARGIN.top + PLOT_HEIGHT;
  const total = bars.reduce((n, b) => n + b.openers.length, 0);
  const from = (bars[0].hundredths / 100).toFixed(2);
  const to = (bars[bars.length - 1].hundredths / 100).toFixed(2);

  return (
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Opener Distribution chart, scrollable">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ minWidth: width }}
        role="img"
        aria-label={`${total} Openers in bars by Average Guess Count, from ${from} to ${to}`}
        className="font-sans text-[11px] tabular-nums"
      >
        {Array.from({ length: top / step + 1 }, (_, i) => {
          const y = floor - i * step * unit;
          return (
            <g key={i}>
              <line x1={MARGIN.left} x2={MARGIN.left + plotWidth} y1={y} y2={y} stroke="var(--highlight-med)" strokeWidth={1} />
              <text x={MARGIN.left - 6} y={y} textAnchor="end" dominantBaseline="middle" fill="var(--subtle)">
                {i * step}
              </text>
            </g>
          );
        })}
        {bars.map((bar, i) => {
          const x = MARGIN.left + i * BAR_WIDTH;
          return (
            <g key={bar.hundredths}>
              {bar.openers.map((o, j) => (
                <rect
                  key={o.word}
                  x={x + 1}
                  width={BAR_WIDTH - 2}
                  y={floor - (j + 1) * unit}
                  height={unit + 0.25}
                  fill={o.is_answer ? ANSWER_FILL : OTHER_FILL}
                />
              ))}
              {bar.hundredths % 5 === 0 && (
                <text x={x + BAR_WIDTH / 2} y={floor + 16} textAnchor="middle" fill="var(--subtle)">
                  {(bar.hundredths / 100).toFixed(2)}
                </text>
              )}
            </g>
          );
        })}
        <line x1={MARGIN.left} x2={MARGIN.left + plotWidth} y1={floor} y2={floor} stroke="var(--highlight-high)" strokeWidth={1} />
        <text x={MARGIN.left + plotWidth / 2} y={height - 6} textAnchor="middle" fill="var(--subtle)">
          Average Guess Count
        </text>
        <text transform={`translate(12 ${MARGIN.top + PLOT_HEIGHT / 2}) rotate(-90)`} textAnchor="middle" fill="var(--subtle)">
          Openers
        </text>
      </svg>
    </div>
  );
}
