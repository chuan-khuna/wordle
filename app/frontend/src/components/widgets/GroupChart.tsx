"use client";

import { useMemo } from "react";
import { barY, defineChart } from "@tanstack/charts";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import { Chart } from "@tanstack/react-charts";
import { CHART_CLASS, CHART_THEME } from "./ui";

export interface Bar {
  marks: string;
  count: number;
}

/**
 * A bar chart of Feedback groups, drawn with TanStack Charts (`@tanstack/react-charts`).
 * Colours are theme roles written as CSS variables (`var(--accent)`), so the bars follow the theme
 * picker live without rebuilding the chart; text and grid use `currentColor`, set by `text-meta`.
 * It only ever renders after the data has arrived on the client, so there is nothing to hydrate.
 * Clicking (or Enter on) a bar calls `onSelect` with its Feedback.
 */
export function GroupChart({
  bars,
  selected,
  onSelect,
  label,
}: {
  bars: readonly Bar[];
  selected: string | null;
  onSelect: (marks: string | null) => void;
  label: string;
}) {
  const definition = useMemo(
    () =>
      defineChart({
        marks: [
          barY(bars, {
            x: "marks",
            y: "count",
            fill: (d) => (d.marks === selected ? "var(--heading)" : "var(--accent)"),
            radius: { end: 1 },
          }),
        ],
        scales: {
          x: {
            scale: () => scaleBand<string>().padding(0.15),
            axis: {
              tickLabels: { rotate: -60, fontSize: 11 },
              ticks: { size: 0 },
            },
          },
          y: {
            scale: scaleLinear,
            nice: true,
            grid: true,
            axis: { label: "Words in the group", ticks: { format: (v) => String(Math.round(v)) } },
          },
        },
        tooltip,
        theme: CHART_THEME,
      }),
    [bars, selected],
  );

  return (
    <div className={CHART_CLASS}>
      <Chart
        definition={definition}
        height={300}
        initialWidth={640}
        ariaLabel={label}
        onSelect={(point) => onSelect(point ? point.datum.marks : null)}
      />
    </div>
  );
}
