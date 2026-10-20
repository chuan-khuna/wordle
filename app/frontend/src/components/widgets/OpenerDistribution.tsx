"use client";

import { type MouseEvent, type PointerEvent, Suspense, memo, useEffect, useId, useMemo, useRef, useState } from "react";
import { type GuessCountOpener, type GuessCountsResponse, getGuessCounts } from "@/lib/api";
import { type Bar, filterOpeners, groupOpeners, labelRows } from "@/lib/opener-bars";
import { type OpenerLookup, lookupOpener } from "@/lib/opener-lookup";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseHighlight } from "./OpenerTable";
import { WidgetFrame } from "./ui";
import { useLoad } from "./useLoad";
import { useWidgetParam } from "./useWidgetParam";

const DEFAULT_STRATEGY = "bits-all";
const STRATEGIES: [string, string][] = [
  ["bits-all", "Expected Information, all words"],
  ["bits-candidates", "Expected Information, Candidates only"],
  ["expected-all", "Expected Candidates, all words"],
  ["expected-candidates", "Expected Candidates, Candidates only"],
];

// Chart geometry in SVG user units. Each bar is at least BAR_WIDTH wide, so a phone scrolls the frame sideways.
const BAR_WIDTH = 14;
const PLOT_HEIGHT = 320;
const LABEL_ROW = 13;
const LABEL_GAP = 40;
const MARGIN = { top: 14, right: 32, bottom: 44, left: 48 };

const ANSWER_FILL = "var(--correct)";
const OTHER_FILL = "var(--present)";
const MARKED_FILL = "var(--accent)";

const isOn = (text: string) => text === "true" || text === "1";

/** A round Y axis step that gives about five gridlines up to `max`. */
function tickStep(max: number): number {
  const rough = Math.max(max, 1) / 5;
  const power = 10 ** Math.floor(Math.log10(rough));
  return [1, 2, 5, 10].map((m) => m * power).find((s) => s >= rough) ?? power * 10;
}

/** What the user typed in the Opener box, as at most five lowercase letters. */
const cleanFind = (text: string) => text.toLowerCase().replace(/[^a-z]/g, "").slice(0, 5);

interface Props {
  strategy?: string;
  answersOnly?: boolean;
  highlight?: string;
  find?: string;
  controls?: boolean;
  id?: string;
}

/**
 * Widget 7: the Opener Distribution. Every Opener of one Strategy played out (the Guess Count Matrix) is one block,
 * stacked in a bar 0.01 wide by its Average Guess Count; the best-ranked Opener is at the bottom of each stack.
 * Blocks are coloured by Answer List membership; highlighted and searched Openers are in the accent colour with
 * their words printed. Hover or tap a block for its stats. On a phone the chart scrolls sideways inside its frame.
 * Props: `strategy` (default `bits-all`), `answersOnly` (chart only Answer List Openers, default false),
 * `highlight` (comma separated words), `find` (one Opener to look up in a stat panel), `controls` (show the Strategy
 * picker, the Answer List toggle and the two word boxes, default true), `id` (URL params `id.strategy`, ...).
 * Each URL param of the same name overrides its prop.
 */
export function OpenerDistribution(props: Props) {
  return (
    <Suspense fallback={<WidgetFrame title="Opener Distribution">Loading…</WidgetFrame>}>
      <Distribution {...props} />
    </Suspense>
  );
}

function Distribution({
  strategy: strategyProp = DEFAULT_STRATEGY,
  answersOnly: answersProp = false,
  highlight: highlightProp = "",
  find: findProp = "",
  controls: controlsProp = true,
  id,
}: Props) {
  const uid = useId();
  const [strategy, setStrategy] = useWidgetParam(id, "strategy", strategyProp);
  const [answersText, setAnswersText] = useWidgetParam(id, "answersOnly", String(answersProp));
  const [highlightText, setHighlightText] = useWidgetParam(id, "highlight", highlightProp);
  const [findText, setFindText] = useWidgetParam(id, "find", findProp);
  const [controlsText] = useWidgetParam(id, "controls", String(controlsProp));
  const answersOnly = isOn(answersText);
  const controls = isOn(controlsText);
  const { data, error, loading } = useLoad(`guess-counts:${strategy}`, (signal) => getGuessCounts(strategy, signal));

  return (
    <WidgetFrame title="Opener Distribution">
      {controls && (
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div>
            <Label htmlFor={`${uid}-strategy`} className="mb-1 block text-sm font-normal text-meta">
              Strategy
            </Label>
            <Select value={strategy} onValueChange={setStrategy}>
              <SelectTrigger id={`${uid}-strategy`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper">
                {STRATEGIES.map(([value, name]) => (
                  <SelectItem key={value} value={value}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor={`${uid}-highlight`} className="mb-1 block text-sm font-normal text-meta">
              Highlight words
            </Label>
            <Input
              id={`${uid}-highlight`}
              value={highlightText}
              onChange={(e) => setHighlightText(e.target.value)}
              placeholder="raise, crane"
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
            />
          </div>
          <div>
            <Label htmlFor={`${uid}-find`} className="mb-1 block text-sm font-normal text-meta">
              Find an Opener
            </Label>
            <Input
              id={`${uid}-find`}
              value={findText}
              onChange={(e) => setFindText(cleanFind(e.target.value))}
              placeholder="tarse"
              maxLength={5}
              autoComplete="off"
              spellCheck={false}
              className="font-mono uppercase placeholder:normal-case"
            />
          </div>
          <div className="flex items-end">
            <Label htmlFor={`${uid}-answers`} className="h-9 cursor-pointer gap-2 text-sm font-normal text-text">
              <input
                id={`${uid}-answers`}
                type="checkbox"
                checked={answersOnly}
                onChange={(e) => setAnswersText(String(e.target.checked))}
                className="h-4 w-4 accent-accent"
              />
              Answer List only
            </Label>
          </div>
        </div>
      )}

      <div aria-live="polite" className="min-h-6 text-sm">
        {loading && <p className="text-meta">Loading the Openers…</p>}
        {error && (
          <p role="alert" className="text-error">
            {error}
          </p>
        )}
      </div>
      {data && <Chart data={data} answersOnly={answersOnly} highlight={highlightText} find={findText} />}
    </WidgetFrame>
  );
}

function Chart({ data, answersOnly, highlight, find }: { data: GuessCountsResponse; answersOnly: boolean; highlight: string; find: string }) {
  const shown = useMemo(() => filterOpeners(data.openers, answersOnly), [data, answersOnly]);
  const bars = useMemo(() => groupOpeners(shown), [shown]);
  const byWord = useMemo(() => new Map(data.openers.map((o) => [o.word, o])), [data]);
  const lookup = useMemo(() => lookupOpener(data.openers, find, answersOnly), [data, find, answersOnly]);
  // Words drawn in the accent colour with a label: the highlighted ones (unknown words match nothing) and the searched one.
  const marked = useMemo(() => {
    const words = parseHighlight(highlight);
    if (lookup.kind === "found") words.add(lookup.opener.word);
    return words;
  }, [highlight, lookup]);
  const partial = data.complete_rows < data.total_rows;

  return (
    <>
      <p className="mb-2 text-sm text-text">{data.strategy.name}</p>
      {partial && (
        <p className="mb-2 text-sm text-meta">
          {data.complete_rows.toLocaleString("en-US")} of {data.total_rows.toLocaleString("en-US")} Openers played
        </p>
      )}
      <StatPanel lookup={lookup} partial={partial} answersOnly={answersOnly} />
      <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Colours">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-3 w-3 rounded-xs" style={{ background: ANSWER_FILL }} />
          On the Answer List
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block h-3 w-3 rounded-xs" style={{ background: OTHER_FILL }} />
          Not on the Answer List
        </li>
        {marked.size > 0 && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-3 w-3 rounded-xs" style={{ background: MARKED_FILL }} />
            Highlighted
          </li>
        )}
      </ul>
      {bars.length > 0 && (
        <Bars
          bars={bars}
          marked={marked}
          byWord={byWord}
          total={data.openers.length}
          focus={lookup.kind === "found" && lookup.charted ? lookup.opener.word : null}
        />
      )}
      <p className="mt-1 text-xs text-meta">
        Each block is one Opener, stacked by Average Guess Count (rounded to two decimals); the best-ranked is at the bottom of its bar.
        Hover or tap a block for its stats.
      </p>
    </>
  );
}

/** The searched Opener's stats, or why there are none. Keeps a line of height so the chart barely moves as you type. */
function StatPanel({ lookup, partial, answersOnly }: { lookup: OpenerLookup<GuessCountOpener>; partial: boolean; answersOnly: boolean }) {
  return (
    <div aria-live="polite" className="mb-3 min-h-6 text-sm">
      {lookup.kind === "unknown" && (
        <p className="text-error">
          <span className="font-mono uppercase">{lookup.word}</span>: {partial ? "not in the Guess List, or not played yet" : "Not in the Guess List"}
        </p>
      )}
      {lookup.kind === "found" && (
        <div className="rounded-sm border border-rule p-3">
          <p className="mb-2 flex items-center gap-2">
            <span aria-hidden className="inline-block h-3 w-3 rounded-xs" style={{ background: MARKED_FILL }} />
            <span className="font-mono text-base font-semibold uppercase text-text">{lookup.opener.word}</span>
          </p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3 lg:grid-cols-5">
            <Stat label="Rank" value={`${lookup.opener.rank.toLocaleString("en-US")} of ${lookup.of.toLocaleString("en-US")}`} />
            <Stat label="Average Guess Count" value={lookup.opener.average_guess_count.toFixed(3)} />
            <Stat label="Losses" value={String(lookup.opener.losses)} />
            <Stat label="On the Answer List" value={lookup.opener.is_answer ? "Yes" : "No"} />
            <Stat
              label="Bar"
              value={`${(lookup.hundredths / 100).toFixed(2)}, with ${lookup.inBar.toLocaleString("en-US")} ${lookup.inBar === 1 ? "Opener" : "Openers"}`}
            />
          </dl>
          {!lookup.charted && answersOnly && (
            <p className="mt-2 text-meta">Not on the Answer List, so it is not on the chart while Answer List only is on.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-meta">{label}</dt>
      <dd className="font-mono text-text">{value}</dd>
    </div>
  );
}

/** Where the tooltip points, in px inside the chart: the block's top centre and its bottom. */
interface Tip {
  word: string;
  left: number;
  top: number;
  bottom: number;
  /** Width of the chart, to keep the tooltip inside it. */
  width: number;
}

interface Geometry {
  floor: number;
  unit: number;
}

/** The blocks. Memoised: hovering changes the tooltip state, and 15,000 rects must not render again for it. */
const Blocks = memo(function Blocks({ bars, marked, geo }: { bars: Bar<GuessCountOpener>[]; marked: Set<string>; geo: Geometry }) {
  return (
    <>
      {bars.map((bar, i) => (
        <g key={bar.hundredths}>
          {bar.openers.map((o, j) => {
            const on = marked.has(o.word);
            return (
              <rect
                key={o.word}
                data-word={o.word}
                x={MARGIN.left + i * BAR_WIDTH + 1}
                width={BAR_WIDTH - 2}
                y={geo.floor - (j + 1) * geo.unit}
                height={geo.unit + 0.25}
                fill={on ? MARKED_FILL : o.is_answer ? ANSWER_FILL : OTHER_FILL}
                stroke={on ? "var(--text)" : undefined}
                strokeWidth={on ? 1 : undefined}
              />
            );
          })}
        </g>
      ))}
    </>
  );
});

function Bars({
  bars,
  marked,
  byWord,
  total,
  focus,
}: {
  bars: Bar<GuessCountOpener>[];
  marked: Set<string>;
  byWord: Map<string, GuessCountOpener>;
  total: number;
  focus: string | null;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<Tip | null>(null);
  const [pinned, setPinned] = useState<Tip | null>(null);

  const tallest = Math.max(...bars.map((b) => b.openers.length));
  const step = tickStep(tallest);
  const top = Math.ceil(tallest / step) * step;
  const unit = PLOT_HEIGHT / top;
  const plotWidth = bars.length * BAR_WIDTH;
  const width = MARGIN.left + plotWidth + MARGIN.right;

  // Printed labels for the marked Openers: above their bar's stack, on separate rows where neighbours would touch.
  const labels = useMemo(() => {
    const found = bars.flatMap((bar, i) =>
      bar.openers
        .map((o, j) => ({ word: o.word, x: MARGIN.left + i * BAR_WIDTH + BAR_WIDTH / 2, j, stack: bar.openers.length }))
        .filter((l) => marked.has(l.word)),
    );
    const rows = labelRows(
      found.map((l) => l.x),
      LABEL_GAP,
    );
    return found.map((l, i) => ({ ...l, row: rows[i] }));
  }, [bars, marked]);
  const headroom = labels.length > 0 ? (Math.max(...labels.map((l) => l.row)) + 1) * LABEL_ROW + 6 : 0;
  const plotTop = MARGIN.top + headroom;
  const height = plotTop + PLOT_HEIGHT + MARGIN.bottom;
  const floor = plotTop + PLOT_HEIGHT;
  const geo = useMemo(() => ({ floor, unit }), [floor, unit]);
  const totalShown = bars.reduce((n, b) => n + b.openers.length, 0);
  const first = bars[0].hundredths;
  const from = (first / 100).toFixed(2);
  const to = (bars[bars.length - 1].hundredths / 100).toFixed(2);

  // Scroll the searched Opener's bar to the middle of the frame (the frame only, never the page).
  const focusBar = focus ? bars.findIndex((b) => b.openers.some((o) => o.word === focus)) : -1;
  useEffect(() => {
    const box = frame.current;
    const drawn = svg.current;
    if (!box || !drawn || focusBar < 0) return;
    const x = ((MARGIN.left + (focusBar + 0.5) * BAR_WIDTH) / width) * drawn.getBoundingClientRect().width;
    box.scrollLeft = Math.max(0, x - box.clientWidth / 2);
    // Only when the searched word or the bars change, not on every resize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, focusBar, first]);

  const tipOf = (target: EventTarget): Tip | null => {
    const word = target instanceof SVGElement ? target.getAttribute("data-word") : null;
    const box = wrap.current;
    if (!word || !box) return null;
    const r = (target as SVGElement).getBoundingClientRect();
    const w = box.getBoundingClientRect();
    return { word, left: r.left - w.left + r.width / 2, top: r.top - w.top, bottom: r.bottom - w.top, width: w.width };
  };
  // Mouse: hover shows the tooltip. Touch (and a mouse click): a tap pins it to that block, a tap elsewhere clears it.
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    const tip = tipOf(e.target);
    setHover((was) => (was?.word === tip?.word ? was : tip));
  };
  const onClick = (e: MouseEvent) => {
    const tip = tipOf(e.target);
    setPinned((was) => (tip && was?.word !== tip.word ? tip : null));
  };

  const shownTip = hover ?? pinned;
  const opener = shownTip ? byWord.get(shownTip.word) : undefined;

  return (
    <div ref={frame} className="overflow-x-auto" tabIndex={0} role="region" aria-label="Opener Distribution chart, scrollable">
      <div ref={wrap} className="relative" style={{ minWidth: width }}>
        <svg
          ref={svg}
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          role="img"
          aria-label={`${totalShown} Openers in bars by Average Guess Count, from ${from} to ${to}`}
          className="block font-sans text-[11px] tabular-nums"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          onClick={onClick}
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
          <Blocks bars={bars} marked={marked} geo={geo} />
          {bars.map((bar, i) =>
            bar.hundredths % 5 === 0 ? (
              <text key={bar.hundredths} x={MARGIN.left + i * BAR_WIDTH + BAR_WIDTH / 2} y={floor + 16} textAnchor="middle" fill="var(--subtle)">
                {(bar.hundredths / 100).toFixed(2)}
              </text>
            ) : null,
          )}
          {labels.map((l) => {
            const labelY = floor - l.stack * unit - 6 - l.row * LABEL_ROW;
            return (
              <g key={l.word} className="pointer-events-none">
                <line x1={l.x} x2={l.x} y1={labelY + 3} y2={floor - (l.j + 1) * unit} stroke="var(--text)" strokeWidth={1} />
                <text x={l.x} y={labelY} textAnchor="middle" fill="var(--text)" className="font-mono font-semibold uppercase">
                  {l.word}
                </text>
              </g>
            );
          })}
          <line x1={MARGIN.left} x2={MARGIN.left + plotWidth} y1={floor} y2={floor} stroke="var(--highlight-high)" strokeWidth={1} />
          <text x={MARGIN.left + plotWidth / 2} y={height - 6} textAnchor="middle" fill="var(--subtle)">
            Average Guess Count
          </text>
          <text transform={`translate(12 ${plotTop + PLOT_HEIGHT / 2}) rotate(-90)`} textAnchor="middle" fill="var(--subtle)">
            Openers
          </text>
        </svg>
        {shownTip && opener && <Tooltip tip={shownTip} opener={opener} total={total} />}
      </div>
    </div>
  );
}

const TOOLTIP_HALF = 96;

function Tooltip({ tip, opener, total }: { tip: Tip; opener: GuessCountOpener; total: number }) {
  const below = tip.top < 110;
  const left = Math.min(Math.max(tip.left, TOOLTIP_HALF), Math.max(tip.width - TOOLTIP_HALF, TOOLTIP_HALF));
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 w-48 rounded-xs border border-highlight-high bg-overlay px-2 py-1.5 text-xs leading-snug text-text"
      style={{ left, top: below ? tip.bottom + 6 : tip.top - 6, transform: `translate(-50%, ${below ? "0" : "-100%"})` }}
    >
      <p className="font-mono text-sm font-semibold uppercase">{opener.word}</p>
      <p>
        Rank {opener.rank.toLocaleString("en-US")} of {total.toLocaleString("en-US")}
      </p>
      <p>Average Guess Count {opener.average_guess_count.toFixed(3)}</p>
      <p>Losses {opener.losses}</p>
      <p>Answer List: {opener.is_answer ? "yes" : "no"}</p>
    </div>
  );
}
