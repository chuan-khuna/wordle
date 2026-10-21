"use client";

import { Suspense, useId, useMemo } from "react";
import { barY, defineChart, group } from "@tanstack/charts";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { tooltip } from "@tanstack/charts/tooltip";
import { Chart } from "@tanstack/react-charts";
import { type BenchmarkStrategy, getBenchmark } from "@/lib/api";
import { STRATEGIES, STRATEGY_GROUPS, shortName } from "@/lib/strategies";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CHART_CLASS, CHART_THEME, WidgetFrame } from "./ui";
import { useLoad } from "./useLoad";
import { useWidgetParam } from "./useWidgetParam";

/**
 * One theme role per Guess Pool and Search Scope; Expected Information takes it as it is, Expected Candidates a
 * lighter tint of it, so the two Rankings of one Guess Pool and Search Scope sit side by side in one hue.
 */
const ROLES: Record<string, string> = {
  "answers-candidates": "var(--accent)",
  "answers-all": "var(--present)",
  "guesses-candidates": "var(--error)",
  "guesses-all": "var(--correct)",
};
const LOST = "Lost";

const DEFAULT_STRATEGIES = STRATEGIES.map((s) => s.id).join(",");

/** The colour of a Strategy, by its id (`<ranking>-<pool>-<scope>`): a theme role, tinted for Expected Candidates. */
export function strategyColor(id: string): string {
  const [by, ...rest] = id.split("-");
  const role = ROLES[rest.join("-")] ?? "var(--accent)";
  return by === "expected" ? `color-mix(in oklab, ${role} 50%, var(--background))` : role;
}
interface Bar {
  count: string;
  strategy: string;
  games: number;
  fill: string;
}

/** The chosen Strategy ids (comma separated), or all Strategies when none match. */
export function pickStrategies<T extends { id: string }>(all: readonly T[], text: string): T[] {
  const ids = text
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(Boolean);
  const picked = ids.map((i) => all.find((s) => s.id === i)).filter((s): s is T => !!s);
  return picked.length > 0 ? [...new Set(picked)] : [...all];
}

/**
 * The `strategies` text after ticking or unticking `id`: the ticked ids in `order`, comma separated. The last
 * ticked Strategy can't be unticked (no ids would mean all of them).
 */
export function toggleStrategy(order: readonly string[], shown: readonly string[], id: string): string {
  const on = new Set(shown);
  if (on.has(id)) {
    if (on.size > 1) on.delete(id);
  } else on.add(id);
  return order.filter((i) => on.has(i)).join(",");
}

/**
 * Widget 6: the Benchmark. Every chosen Strategy plays all 2315 Answers; the chart groups the Guess Distribution
 * by Guess Count (1 to 6), with the Losses as a last group, one bar per Strategy. A picker above it ticks the
 * Strategies to show, grouped by Ranking. A table below gives each Strategy's Opener, Average Guess Count, Losses
 * (with the lost Answers) and the exact counts.
 * Props: `strategies` (comma separated ids, default all eight, e.g. `bits-answers-candidates,bits-guesses-all`),
 * `id` (URL param `id.strategies`). The URL param `strategies` overrides the prop.
 */
export function BenchmarkChart(props: { strategies?: string; id?: string }) {
  return (
    <Suspense fallback={<WidgetFrame title="Benchmark chart">Loading…</WidgetFrame>}>
      <Benchmark {...props} />
    </Suspense>
  );
}

function Benchmark({ strategies: prop = DEFAULT_STRATEGIES, id }: { strategies?: string; id?: string }) {
  const uid = useId();
  const [text, setText] = useWidgetParam(id, "strategies", prop);
  const { data, error, loading } = useLoad("benchmark", (signal) => getBenchmark(signal));
  const limit = data?.guess_limit ?? 6;
  const shown = useMemo(() => (data ? pickStrategies(data.strategies, text) : []), [data, text]);
  const colors = useMemo(() => new Map(shown.map((s) => [s.id, strategyColor(s.id)])), [shown]);
  const order = useMemo(() => (data ? data.strategies.map((s) => s.id) : []), [data]);
  const shownIds = shown.map((s) => s.id);
  // The picker lists the Strategies the Benchmark holds, grouped by Ranking.
  const groups = STRATEGY_GROUPS.map((g) => ({ ...g, strategies: g.strategies.filter((s) => order.includes(s.id)) })).filter(
    (g) => g.strategies.length > 0,
  );

  return (
    <WidgetFrame title="Benchmark chart">
      <div aria-live="polite" className="min-h-6 text-sm">
        {loading && <p className="text-meta">Loading the Benchmark…</p>}
        {error && (
          <p role="alert" className="text-error">
            {error}
          </p>
        )}
      </div>

      {data && (
        <>
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {groups.map((g) => (
              <fieldset key={g.by}>
                <legend className="mb-1 text-sm text-meta">{g.label}</legend>
                <div className="flex flex-col gap-1">
                  {g.strategies.map((s) => {
                    const checked = shownIds.includes(s.id);
                    return (
                      <label key={s.id} htmlFor={`${uid}-${s.id}`} className="flex items-center gap-2 text-sm text-text">
                        <input
                          id={`${uid}-${s.id}`}
                          type="checkbox"
                          className="h-4 w-4 accent-accent"
                          checked={checked}
                          disabled={checked && shownIds.length === 1}
                          onChange={() => setText(toggleStrategy(order, shownIds, s.id))}
                        />
                        <span aria-hidden className="inline-block h-3 w-3 rounded-xs" style={{ background: strategyColor(s.id) }} />
                        {shortName(s)}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>

          <DistributionChart strategies={shown} colors={colors} limit={limit} />
          <p className="mt-1 text-xs text-meta">
            Games won at each Guess Count; the last group counts the Losses (not solved within {limit} Guesses).
          </p>

          <div className="mt-5 overflow-x-auto" tabIndex={0} role="region" aria-label="Benchmark results, scrollable">
            <Table className="min-w-[34rem]">
              <TableCaption className="sr-only">Benchmark results for each Strategy, with its Guess Distribution.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className="text-left">Strategy</TableHead>
                  <TableHead scope="col" className="text-left">Opener</TableHead>
                  <TableHead scope="col" className="text-right">Average Guess Count</TableHead>
                  <TableHead scope="col" className="text-right">Losses</TableHead>
                  {Array.from({ length: limit }, (_, i) => (
                    <TableHead key={i} scope="col" className="text-right">
                      {i + 1}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((s) => (
                  <TableRow key={s.id}>
                    <TableHead scope="row" className="text-left font-normal text-text whitespace-nowrap">
                      <span aria-hidden className="mr-1.5 inline-block h-3 w-3 rounded-xs align-middle" style={{ background: colors.get(s.id) }} />
                      {s.name}
                    </TableHead>
                    <TableCell className="font-mono uppercase">{s.opener}</TableCell>
                    <TableCell className="text-right font-mono font-semibold text-text">{s.average_guess_count.toFixed(3)}</TableCell>
                    <TableCell className={`text-right font-mono ${s.losses > 0 ? "font-semibold text-error" : ""}`}>{s.losses}</TableCell>
                    {s.distribution.map((n, i) => (
                      <TableCell key={i} className="text-right font-mono">
                        {n}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {shown.some((s) => s.losses > 0) && (
            <dl className="mt-3 space-y-1 text-sm">
              {shown
                .filter((s) => s.losses > 0)
                .map((s) => (
                  <div key={s.id}>
                    <dt className="inline text-meta">{s.name} lost: </dt>
                    <dd className="inline font-mono uppercase">{s.lost_answers.join(", ")}</dd>
                  </div>
                ))}
            </dl>
          )}
          <p className="mt-2 text-xs text-meta">
            Average Guess Count is over every Game, a Loss at the Guess Count it needed; each Strategy played {shown[0]?.games ?? 0} Games.
          </p>
        </>
      )}
    </WidgetFrame>
  );
}

function DistributionChart({ strategies, colors, limit }: { strategies: BenchmarkStrategy[]; colors: Map<string, string>; limit: number }) {
  const definition = useMemo(() => {
    const counts = [...Array.from({ length: limit }, (_, i) => String(i + 1)), LOST];
    const bars: Bar[] = strategies.flatMap((s) =>
      [...s.distribution, s.losses].map((games, i) => ({ count: counts[i], strategy: s.name, games, fill: colors.get(s.id) ?? "var(--accent)" })),
    );
    return defineChart({
      marks: [
        barY(bars, {
          x: "count",
          y: "games",
          z: "strategy",
          fill: (d) => d.fill,
          layout: group({ padding: 0.05 }),
          radius: { end: 1 },
        }),
      ],
      scales: {
        x: {
          scale: () => scaleBand<string>().domain(counts).padding(0.15),
          axis: { label: "Guess Count", ticks: { size: 0 } },
        },
        y: {
          scale: scaleLinear,
          nice: true,
          grid: true,
          axis: { label: "Games", ticks: { format: (v) => String(Math.round(v)) } },
        },
      },
      tooltip,
      theme: CHART_THEME,
    });
  }, [strategies, colors, limit]);

  return (
    <div className={CHART_CLASS}>
      <Chart definition={definition} height={300} initialWidth={640} ariaLabel="Guess Distribution of each Strategy: Games won at each Guess Count, and Losses" />
    </div>
  );
}
