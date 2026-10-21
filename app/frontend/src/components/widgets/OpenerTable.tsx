"use client";

import { Suspense, useId, useMemo, useState } from "react";
import { type Opener, getOpeners } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WidgetFrame } from "./ui";
import { useLoad } from "./useLoad";
import { useWidgetParam } from "./useWidgetParam";

type SortKey = "rank" | "word" | "bits" | "expected_candidates" | "groups" | "largest_group" | "is_candidate";

const COLUMNS: { key: SortKey; label: string; numeric?: boolean; first: "asc" | "desc" }[] = [
  { key: "rank", label: "Rank", numeric: true, first: "asc" },
  { key: "word", label: "Opener", first: "asc" },
  { key: "bits", label: "Bits", numeric: true, first: "desc" },
  { key: "expected_candidates", label: "Expected Candidates", numeric: true, first: "asc" },
  { key: "groups", label: "Groups", numeric: true, first: "desc" },
  { key: "largest_group", label: "Largest group", numeric: true, first: "asc" },
  { key: "is_candidate", label: "Candidate?", first: "desc" },
];

/** `top` as a count: a positive integer, else the fallback. */
export function parseTop(text: string, fallback = 20): number {
  const n = Number.parseInt(text, 10);
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 500) : fallback;
}

/** The words to emphasise: lowercase five-letter words from a comma separated list. */
export function parseHighlight(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[\s,]+/)
      .filter((w) => /^[a-z]{5}$/.test(w)),
  );
}

/**
 * Widget 5: the Opener leaderboard, the best first Guesses by Expected Information (precomputed by the backend).
 * A table of rank, Opener, bits, Expected Candidates, groups, largest group and whether the Opener is a Candidate.
 * Click a column heading to sort (again to reverse). Words in `highlight` are emphasised, and listed even
 * when they fall outside the top `top` rows.
 * Props: `top` (default 20), `highlight` ("crane,slate"), `id` (URL params `id.top`, `id.highlight`).
 * URL params `top` and `highlight` override the props.
 */
export function OpenerTable(props: { top?: number; highlight?: string; id?: string }) {
  return (
    <Suspense fallback={<WidgetFrame title="Opener table">Loading…</WidgetFrame>}>
      <OpenerRows {...props} />
    </Suspense>
  );
}

function OpenerRows({ top: topProp = 20, highlight: highlightProp = "", id }: { top?: number; highlight?: string; id?: string }) {
  const uid = useId();
  const [topText, setTopText] = useWidgetParam(id, "top", String(topProp));
  const [highlightText] = useWidgetParam(id, "highlight", highlightProp);
  const top = parseTop(topText);
  const marked = useMemo(() => parseHighlight(highlightText), [highlightText]);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "rank", dir: "asc" });

  // Highlighted words outside the top rows are fetched with the whole table, then shown after the top rows.
  const wanted = marked.size > 0 ? 500 : top;
  const { data, error, loading } = useLoad(`openers|${wanted}`, (signal) => getOpeners(wanted, signal));

  const rows = useMemo(() => {
    if (!data) return [];
    const shown = data.openers.filter((o) => o.rank <= top || marked.has(o.word));
    const sign = sort.dir === "asc" ? 1 : -1;
    return [...shown].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      const c = typeof x === "string" && typeof y === "string" ? x.localeCompare(y) : Number(x) - Number(y);
      return c * sign || a.rank - b.rank;
    });
  }, [data, top, marked, sort]);

  return (
    <WidgetFrame title="Opener table">
      <div className="max-w-40">
        <Label htmlFor={`${uid}-top`} className="mb-1 block text-sm font-normal text-meta">
          Rows to show
        </Label>
        <Input
          id={`${uid}-top`}
          type="number"
          min={1}
          max={500}
          inputMode="numeric"
          value={topText}
          onChange={(e) => setTopText(e.target.value)}
          className="font-mono"
        />
      </div>

      <div aria-live="polite" className="mt-3 min-h-6 text-sm">
        {loading && <p className="text-meta">Loading the Opener leaderboard…</p>}
        {error && (
          <p role="alert" className="text-error">
            {error}
          </p>
        )}
      </div>

      {data && (
        <>
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Opener table, scrollable">
            <Table className="min-w-[34rem]">
              <TableCaption className="sr-only">
                The {rows.length} best Openers by Expected Information, out of {data.total} scored.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  {COLUMNS.map((c) => {
                    const active = sort.key === c.key;
                    return (
                      <TableHead
                        key={c.key}
                        scope="col"
                        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                        className={c.numeric ? "text-right" : "text-left"}
                      >
                        <Button
                          variant="ghost"
                          onClick={() => setSort(active ? { key: c.key, dir: sort.dir === "asc" ? "desc" : "asc" } : { key: c.key, dir: c.first })}
                          className="h-auto p-0 font-medium text-inherit hover:bg-transparent hover:text-text"
                        >
                          {c.label}
                          <span aria-hidden className="ml-1 inline-block w-3 text-text">
                            {active ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                          </span>
                        </Button>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((o) => (
                  <Row key={o.word} o={o} on={marked.has(o.word)} />
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="mt-2 text-xs text-meta">
            {data.total} Openers are scored; Expected Candidates is the number of Candidates an Opener is expected to leave.
            Click a heading to sort by it.
          </p>
        </>
      )}
    </WidgetFrame>
  );
}

function Row({ o, on }: { o: Opener; on: boolean }) {
  return (
    <TableRow className={on ? "bg-highlight-low" : undefined}>
      <TableCell className="text-right text-meta tabular-nums">{o.rank}</TableCell>
      <TableCell className={`font-mono uppercase ${on ? "font-semibold text-text" : ""}`}>{o.word}</TableCell>
      <TableCell className="text-right tabular-nums">{o.bits.toFixed(3)}</TableCell>
      <TableCell className="text-right tabular-nums">{o.expected_candidates.toFixed(1)}</TableCell>
      <TableCell className="text-right tabular-nums">{o.groups}</TableCell>
      <TableCell className="text-right tabular-nums">{o.largest_group}</TableCell>
      <TableCell>{o.is_candidate ? "Yes" : "No"}</TableCell>
    </TableRow>
  );
}
