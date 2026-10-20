"use client";

import { XIcon } from "lucide-react";
import { type MouseEvent, type PointerEvent, Suspense, memo, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { type GuessCountOpener, type GuessCountsResponse, getGuessCounts } from "@/lib/api";
import { type Bar, chartDomain, filterOpeners, groupOpeners, labelRows } from "@/lib/opener-bars";
import { type BarColumn, addWord, barColumn, columnHeading } from "@/lib/opener-column";
import { type OpenerLookup, lookupOpener, sortLookups } from "@/lib/opener-lookup";
import { Button } from "@/components/ui/button";
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

interface Props {
  strategy?: string;
  answersOnly?: boolean;
  highlight?: string;
  controls?: boolean;
  id?: string;
}

/**
 * Widget 7: the Opener Distribution. Every Opener of one Strategy played out (the Guess Count Matrix) is one block,
 * stacked in a bar 0.01 wide by its Average Guess Count; the best-ranked Opener is at the bottom of each stack.
 * Blocks are coloured by Answer List membership; highlighted Openers are in the accent colour with their words
 * printed, and each gets a stat card. Hover a block for its stats, click or tap a bar for a side column listing its
 * Openers. The chart keeps its pixel size and its X range when the Answer List filter flips; only the Y axis
 * rescales to the Openers shown. On a phone the chart scrolls sideways inside its frame.
 * Props: `strategy` (default `bits-all`), `answersOnly` (chart only Answer List Openers, default false),
 * `highlight` (comma separated words), `controls` (show the Strategy picker, the highlight field and the Answer List
 * toggle, default true), `id` (URL params `id.strategy`, ...). Each URL param of the same name overrides its prop.
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
  controls: controlsProp = true,
  id,
}: Props) {
  const uid = useId();
  const [strategy, setStrategy] = useWidgetParam(id, "strategy", strategyProp);
  const [answersText, setAnswersText] = useWidgetParam(id, "answersOnly", String(answersProp));
  const [highlightText, setHighlightText] = useWidgetParam(id, "highlight", highlightProp);
  const [controlsText] = useWidgetParam(id, "controls", String(controlsProp));
  const answersOnly = isOn(answersText);
  const controls = isOn(controlsText);
  const { data, error, loading } = useLoad(`guess-counts:${strategy}`, (signal) => getGuessCounts(strategy, signal));

  return (
    <WidgetFrame title="Opener Distribution">
      {controls && (
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_auto]">
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
              Highlight words, comma separated
            </Label>
            <Input
              id={`${uid}-highlight`}
              value={highlightText}
              onChange={(e) => setHighlightText(e.target.value)}
              placeholder="tarse, raise, crane"
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
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
      {data && (
        <Chart
          key={strategy}
          data={data}
          answersOnly={answersOnly}
          highlight={highlightText}
          onHighlight={(word) => setHighlightText(addWord(highlightText, word))}
        />
      )}
    </WidgetFrame>
  );
}

function Chart({
  data,
  answersOnly,
  highlight,
  onHighlight,
}: {
  data: GuessCountsResponse;
  answersOnly: boolean;
  highlight: string;
  onHighlight: (word: string) => void;
}) {
  // The x range comes from every Opener, so bars never move sideways; the Y axis fits the Openers shown.
  const domain = useMemo(() => chartDomain(data.openers, answersOnly), [data, answersOnly]);
  const everyBar = useMemo(() => (domain ? groupOpeners(data.openers, domain) : []), [data, domain]);
  const bars = useMemo(
    () => (domain ? groupOpeners(filterOpeners(data.openers, answersOnly), domain) : []),
    [data, domain, answersOnly],
  );
  const byWord = useMemo(() => new Map(data.openers.map((o) => [o.word, o])), [data]);
  // The highlighted words in the order typed: all are drawn in the accent colour and get a card.
  const words = useMemo(() => [...parseHighlight(highlight)], [highlight]);
  const marked = useMemo(() => new Set(words), [words]);
  const lookups = useMemo(() => words.map((w) => lookupOpener(data.openers, w, answersOnly)), [data, words, answersOnly]);
  const cards = useMemo(() => sortLookups(lookups), [lookups]);
  const [selected, setSelected] = useState<number | null>(null);
  const column = useMemo(() => (selected === null ? null : barColumn(bars, selected, marked)), [bars, selected, marked]);
  const partial = data.complete_rows < data.total_rows;
  // The frame scrolls to the most recently added word, when it is on the chart.
  const last = lookups[lookups.length - 1];
  const focus = last?.kind === "found" && last.charted ? last.opener.word : null;

  return (
    <>
      <p className="mb-2 text-sm text-text">{data.strategy.name}</p>
      {partial && (
        <p className="mb-2 text-sm text-meta">
          {data.complete_rows.toLocaleString("en-US")} of {data.total_rows.toLocaleString("en-US")} Openers played
        </p>
      )}
      <StatCards lookups={cards} partial={partial} />
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
      {domain && (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <Bars
              bars={bars}
              everyBar={everyBar}
              tallest={domain.tallest}
              marked={marked}
              byWord={byWord}
              total={data.openers.length}
              focus={focus}
              selected={selected}
              onSelect={setSelected}
            />
          </div>
          {column && <BarList column={column} onClose={() => setSelected(null)} onPick={onHighlight} />}
        </div>
      )}
      <p className="mt-1 text-xs text-meta">
        Each block is one Opener, stacked by Average Guess Count (rounded to two decimals); the best-ranked is at the bottom of its bar.
        Hover a block for its stats; click or tap a bar to list its Openers.
      </p>
    </>
  );
}

/** One card per highlighted word on the Guess List, best rank first, then a note for each that is not. */
function StatCards({ lookups, partial }: { lookups: OpenerLookup<GuessCountOpener>[]; partial: boolean }) {
  const found = lookups.filter((l) => l.kind === "found");
  const unknown = lookups.filter((l) => l.kind === "unknown");
  if (found.length === 0 && unknown.length === 0) return null;
  return (
    <div aria-live="polite" className="mb-3 space-y-2 text-sm">
      {found.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {found.map((l) => {
            const { opener } = l;
            // How far up the ranking: the best Opener fills the bar, the worst leaves it empty.
            const standing = l.of > 1 ? (100 * (l.of - opener.rank)) / (l.of - 1) : 100;
            const bar = (l.hundredths / 100).toFixed(2);
            return (
              <li key={opener.word} className="rounded-sm border border-l-4 border-rule p-3" style={{ borderLeftColor: MARKED_FILL }}>
                <div className="flex items-start justify-between gap-3">
                  <span className="font-mono text-xl font-semibold uppercase leading-none tracking-wider text-text">{opener.word}</span>
                  <p className="text-right leading-none">
                    <span className="text-xl font-semibold tabular-nums text-text">#{opener.rank.toLocaleString("en-US")}</span>
                    <span className="mt-1 block text-xs text-meta">of {l.of.toLocaleString("en-US")}</span>
                  </p>
                </div>
                <p className="mt-3 flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-semibold leading-none tabular-nums text-text">{opener.average_guess_count.toFixed(3)}</span>
                  <span className="text-xs text-meta">Average Guess Count</span>
                </p>
                <div aria-hidden className="mt-3 h-1 rounded-full bg-highlight-med" title={`Ahead of ${Math.round(standing)}% of the Openers`}>
                  <div className="h-full rounded-full" style={{ width: `${standing}%`, background: MARKED_FILL }} />
                </div>
                <p className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-meta">
                  <span>{opener.is_answer ? "Answer List ✓" : "Not an answer"}</span>
                  <span>
                    {opener.losses} {opener.losses === 1 ? "loss" : "losses"}
                  </span>
                  <span>
                    Bar {bar} ·{" "}
                    {l.charted ? `${l.inBar.toLocaleString("en-US")} ${l.inBar === 1 ? "Opener" : "Openers"}` : "hidden by Answer List only"}
                  </span>
                </p>
              </li>
            );
          })}
        </ul>
      )}
      {unknown.map((l) => (
        <p key={l.word} className="text-error">
          <span className="font-mono uppercase">{l.word}</span>: {partial ? "not in the Guess List, or not played yet" : "Not in the Guess List"}
        </p>
      ))}
    </div>
  );
}

/** The side column: one selected bar's Openers, best first. A word adds itself to the highlight field. */
function BarList({ column, onClose, onPick }: { column: BarColumn<GuessCountOpener>; onClose: () => void; onPick: (word: string) => void }) {
  return (
    <aside aria-label="Openers in the selected bar" className="min-w-0 rounded-sm border border-rule lg:w-80 lg:shrink-0">
      <div className="flex items-center justify-between gap-2 border-b border-rule py-1 pl-3 pr-1">
        <h3 className="text-sm font-medium tabular-nums text-text">{column.heading}</h3>
        <Button variant="ghost" size="icon-xs" aria-label="Close the list" title="Close" onClick={onClose}>
          <XIcon />
        </Button>
      </div>
      {column.rows.length === 0 ? (
        <p className="p-3 text-sm text-meta">No Openers in this bar.</p>
      ) : (
        <div className="max-h-72 overflow-y-auto lg:max-h-[26rem]">
          <table className="w-full table-fixed text-xs tabular-nums">
            <thead className="sticky top-0 bg-background text-meta">
              <tr className="text-right">
                <th scope="col" className="w-[26%] px-2 py-1 text-left font-normal">
                  Word
                </th>
                <th scope="col" className="w-[18%] px-2 py-1 font-normal">
                  Rank
                </th>
                <th scope="col" className="w-[24%] px-2 py-1 font-normal">
                  Average
                </th>
                <th scope="col" className="w-[18%] px-2 py-1 font-normal">
                  Losses
                </th>
                <th scope="col" className="w-[14%] px-2 py-1 font-normal">
                  List
                </th>
              </tr>
            </thead>
            <tbody>
              {column.rows.map((o) => (
                <tr key={o.word} className={`border-t border-rule text-right ${o.marked ? "bg-accent/20 font-semibold" : ""}`}>
                  <td className="px-2 py-0.5 text-left">
                    <button
                      type="button"
                      onClick={() => onPick(o.word)}
                      title={`Highlight ${o.word}`}
                      className="cursor-pointer font-mono uppercase underline-offset-2 hover:underline focus-visible:underline"
                    >
                      {o.word}
                    </button>
                  </td>
                  <td className="px-2 py-0.5">{o.rank.toLocaleString("en-US")}</td>
                  <td className="px-2 py-0.5">{o.average_guess_count.toFixed(3)}</td>
                  <td className="px-2 py-0.5">{o.losses}</td>
                  <td className="px-2 py-0.5">
                    <span
                      aria-hidden
                      className="inline-block h-2.5 w-2.5 rounded-xs align-middle"
                      style={{ background: o.is_answer ? ANSWER_FILL : OTHER_FILL }}
                    />
                    <span className="sr-only">{o.is_answer ? "On the Answer List" : "Not on the Answer List"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </aside>
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

/** A bar's value and count, printed above its stack: on hover, and on the selected bar. */
function CountLabel({ bar, index, geo, width }: { bar: Bar<GuessCountOpener>; index: number; geo: Geometry; width: number }) {
  const half = 56;
  const x = Math.min(Math.max(MARGIN.left + index * BAR_WIDTH + BAR_WIDTH / 2, MARGIN.left + half), width - MARGIN.right - half);
  const y = Math.max(geo.floor - bar.openers.length * geo.unit - 7, 11);
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fill="var(--text)"
      className="pointer-events-none font-semibold"
      style={{ paintOrder: "stroke", stroke: "var(--background)", strokeWidth: 4, strokeLinejoin: "round" }}
    >
      {columnHeading(bar.hundredths, bar.openers.length)}
    </text>
  );
}

function Bars({
  bars,
  everyBar,
  tallest,
  marked,
  byWord,
  total,
  focus,
  selected,
  onSelect,
}: {
  bars: Bar<GuessCountOpener>[];
  /** The same bars without the Answer List filter: label rows and headroom come from these, so they do not move. */
  everyBar: Bar<GuessCountOpener>[];
  /** The tallest stack shown, for the Y axis. */
  tallest: number;
  marked: Set<string>;
  byWord: Map<string, GuessCountOpener>;
  total: number;
  focus: string | null;
  selected: number | null;
  onSelect: (hundredths: number) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<Tip | null>(null);
  const [hoverBar, setHoverBar] = useState<number | null>(null);
  const [pinnedWord, setPinnedWord] = useState<string | null>(null);
  const [pinned, setPinned] = useState<Tip | null>(null);

  const step = tickStep(tallest);
  const top = Math.ceil(tallest / step) * step;
  const unit = PLOT_HEIGHT / top;
  const plotWidth = bars.length * BAR_WIDTH;
  const width = MARGIN.left + plotWidth + MARGIN.right;

  // Printed labels for the marked Openers: above their bar's stack, on separate rows where neighbours would touch.
  const rowOf = useMemo(() => {
    const found = everyBar.flatMap((bar, i) =>
      bar.openers.filter((o) => marked.has(o.word)).map((o) => ({ word: o.word, x: MARGIN.left + i * BAR_WIDTH + BAR_WIDTH / 2 })),
    );
    const rows = labelRows(
      found.map((l) => l.x),
      LABEL_GAP,
    );
    return new Map(found.map((l, i) => [l.word, rows[i]]));
  }, [everyBar, marked]);
  const labels = useMemo(
    () =>
      bars.flatMap((bar, i) =>
        bar.openers
          .map((o, j) => ({ word: o.word, x: MARGIN.left + i * BAR_WIDTH + BAR_WIDTH / 2, j, stack: bar.openers.length, row: rowOf.get(o.word) ?? 0 }))
          .filter((l) => marked.has(l.word)),
      ),
    [bars, marked, rowOf],
  );
  const headroom = rowOf.size > 0 ? (Math.max(...rowOf.values()) + 1) * LABEL_ROW + 6 : 0;
  const plotTop = MARGIN.top + headroom;
  const height = plotTop + PLOT_HEIGHT + MARGIN.bottom;
  const floor = plotTop + PLOT_HEIGHT;
  const geo = useMemo(() => ({ floor, unit }), [floor, unit]);
  const totalShown = bars.reduce((n, b) => n + b.openers.length, 0);
  const first = bars[0].hundredths;
  const from = (first / 100).toFixed(2);
  const to = (bars[bars.length - 1].hundredths / 100).toFixed(2);
  const selectedIndex = selected === null ? -1 : bars.findIndex((b) => b.hundredths === selected);

  // Scroll the newest highlighted Opener's bar to the middle of the frame (the frame only, never the page).
  const focusBar = focus ? bars.findIndex((b) => b.openers.some((o) => o.word === focus)) : -1;
  useEffect(() => {
    const box = frame.current;
    const drawn = svg.current;
    if (!box || !drawn || focusBar < 0) return;
    const x = ((MARGIN.left + (focusBar + 0.5) * BAR_WIDTH) / width) * drawn.getBoundingClientRect().width;
    box.scrollLeft = Math.max(0, x - box.clientWidth / 2);
    // Only when the word or its bar changes, not on every resize.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, focusBar, first]);

  const tipOf = (element: Element): Tip | null => {
    const word = element.getAttribute("data-word");
    const box = wrap.current;
    if (!word || !box) return null;
    const r = element.getBoundingClientRect();
    const w = box.getBoundingClientRect();
    return { word, left: r.left - w.left + r.width / 2, top: r.top - w.top, bottom: r.bottom - w.top, width: w.width };
  };
  // The pinned tooltip follows its block: selecting a bar can narrow the chart (the side column), which moves the block.
  useLayoutEffect(() => {
    const block = pinnedWord ? svg.current?.querySelector(`[data-word="${pinnedWord}"]`) : null;
    setPinned(block ? tipOf(block) : null);
  }, [pinnedWord, selected, bars]);

  /** The index of the bar whose column is under the pointer, empty space above its stack included. */
  const columnAt = (e: { clientX: number; clientY: number }): number | null => {
    const r = svg.current?.getBoundingClientRect();
    if (!r) return null;
    const x = ((e.clientX - r.left) / r.width) * width;
    const y = ((e.clientY - r.top) / r.height) * height;
    const i = Math.floor((x - MARGIN.left) / BAR_WIDTH);
    return i >= 0 && i < bars.length && y >= 0 && y <= floor ? i : null;
  };
  // Mouse: hover shows the tooltip and the column count. Touch and click: a tap on a bar selects it and, on a block,
  // pins that block's tooltip (a tap elsewhere clears the pin).
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    setHoverBar(columnAt(e));
    const tip = e.target instanceof SVGElement ? tipOf(e.target) : null;
    setHover((was) => (was?.word === tip?.word ? was : tip));
  };
  const onClick = (e: MouseEvent) => {
    const i = columnAt(e);
    if (i !== null) onSelect(bars[i].hundredths);
    const word = e.target instanceof SVGElement ? e.target.getAttribute("data-word") : null;
    setPinnedWord((was) => (word && was !== word ? word : null));
  };

  const shownTip = hover ?? pinned;
  const opener = shownTip ? byWord.get(shownTip.word) : undefined;
  const hoverIndex = hoverBar !== null && hoverBar !== selectedIndex ? hoverBar : -1;

  return (
    <div ref={frame} className="overflow-x-auto" tabIndex={0} role="region" aria-label="Opener Distribution chart, scrollable">
      <div ref={wrap} className="relative" style={{ minWidth: width }}>
        <svg
          ref={svg}
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          role="img"
          aria-label={`${totalShown} Openers in bars by Average Guess Count, from ${from} to ${to}`}
          className="block cursor-pointer font-sans text-[11px] tabular-nums"
          onPointerMove={onMove}
          onPointerLeave={() => {
            setHover(null);
            setHoverBar(null);
          }}
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
          {hoverIndex >= 0 && (
            <rect
              x={MARGIN.left + hoverIndex * BAR_WIDTH}
              y={plotTop}
              width={BAR_WIDTH}
              height={PLOT_HEIGHT}
              fill="var(--highlight-med)"
              opacity={0.5}
              className="pointer-events-none"
            />
          )}
          <Blocks bars={bars} marked={marked} geo={geo} />
          {selectedIndex >= 0 && (
            <rect
              x={MARGIN.left + selectedIndex * BAR_WIDTH}
              y={plotTop}
              width={BAR_WIDTH}
              height={PLOT_HEIGHT}
              fill="var(--heading)"
              fillOpacity={0.12}
              stroke="var(--heading)"
              strokeWidth={2}
              className="pointer-events-none"
            />
          )}
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
          {hoverIndex >= 0 && <CountLabel bar={bars[hoverIndex]} index={hoverIndex} geo={geo} width={width} />}
          {selectedIndex >= 0 && <CountLabel bar={bars[selectedIndex]} index={selectedIndex} geo={geo} width={width} />}
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
