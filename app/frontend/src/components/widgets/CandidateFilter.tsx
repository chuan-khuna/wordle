"use client";

import { Suspense, useEffect, useState } from "react";
import { postCandidates } from "@/lib/api";
import { marksToString } from "@/lib/wordle/feedback";
import { rowsFromState } from "@/lib/widgets/state-board";
import { type Row, formatState } from "@/lib/widgets/widget-state";
import { StateBoard } from "./_components/StateBoard";
import { WIDGET_TITLES } from "@/lib/widgets/widget-titles.mjs";
import { WidgetFrame } from "./_components/ui";
import { useParamInitial, useParamSync } from "./_components/useWidgetParam";

type Outcome = { count: number; words: string[] } | { error: string };
type Result = { key: string; outcomes: Outcome[] };


/**
 * Widget 2: build a State (Guesses with their Feedback), watch the Candidate Set shrink.
 * Props: `state` ("crane:00102,slate:01200": rows of `guess:feedback`, digits 0 Absent, 1 Present, 2 Correct),
 * `id` (namespaces the URL param to `id.state`). The URL param `state` (or `id.state`) overrides the prop.
 * Calls /api/candidates once per prefix of the State, so each row can show its count before and after.
 */
export function CandidateFilter(props: { state?: string; id?: string }) {
  return (
    <Suspense fallback={<WidgetFrame title={WIDGET_TITLES.CandidateFilter}>Loading…</WidgetFrame>}>
      <Filter {...props} />
    </Suspense>
  );
}

function Filter({ state: stateProp = "", id }: { state?: string; id?: string }) {
  const propText = formatState(rowsFromState(stateProp));
  const initial = useParamInitial(id, "state", propText);
  const [rows, setRows] = useState<Row[]>(() => rowsFromState(initial));
  const text = formatState(rows);
  useParamSync(id, "state", text, propText);

  // Every row is a complete Guess; each one narrows the Candidate Set.
  const key = rows.map((r) => `${r.guess}:${marksToString(r.marks)}`).join(",");

  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => {
    const ctl = new AbortController();
    const turns = key === "" ? [] : key.split(",").map((t) => ({ guess: t.slice(0, 5), feedback: t.slice(6) }));
    const timer = setTimeout(() => {
      Promise.all(
        turns.map((_, i) => i).concat(turns.length).map((k) =>
          postCandidates(turns.slice(0, k), ctl.signal).then(
            (r): Outcome => r,
            (e: Error): Outcome => {
              if (e.name === "AbortError") throw e;
              return { error: e.message };
            },
          ),
        ),
      ).then(
        (outcomes) => setResult({ key, outcomes }),
        () => {},
      );
    }, 200);
    return () => {
      clearTimeout(timer);
      ctl.abort();
    };
  }, [key]);

  const fresh = result?.key === key ? result.outcomes : null;
  const last = fresh?.[fresh.length - 1];
  const firstError = fresh?.findIndex((o) => "error" in o) ?? -1;
  const finalOutcome = fresh && firstError === -1 ? last : undefined;


  return (
    <WidgetFrame title={WIDGET_TITLES.CandidateFilter}>
      <StateBoard
        rows={rows}
        onChange={setRows}
        label="State"
        renderRowEnd={(_, i) => {
          const before = fresh?.[i];
          const after = fresh?.[i + 1];
          return (
            <div className="min-w-32 text-sm" aria-live="polite">
              {!fresh ? (
                <span className="text-meta">…</span>
              ) : after && "error" in after && before && !("error" in before) ? (
                <span role="alert" className="text-error">
                  {after.error}
                </span>
              ) : before && after && !("error" in before) && !("error" in after) ? (
                <span>
                  <span className="tabular-nums">{before.count}</span> → <strong className="text-text tabular-nums">{after.count}</strong>{" "}
                  <span className="text-meta">Candidates</span>
                </span>
              ) : (
                <span className="text-meta">—</span>
              )}
            </div>
          );
        }}
      />

      <div className="mt-4 border-t border-rule pt-4" aria-live="polite">
        {!fresh ? (
          <p className="text-meta">Loading the Candidate Set…</p>
        ) : firstError !== -1 ? (
          <p role="alert" className="text-error">
            {(fresh[firstError] as { error: string }).error}
          </p>
        ) : finalOutcome && !("error" in finalOutcome) ? (
          <>
            <p>
              <strong className="text-text">{finalOutcome.count}</strong> Candidate{finalOutcome.count === 1 ? "" : "s"}
              {rows.length === 0 && " (the whole Answer List)"}
              {finalOutcome.count === 0 && ": no Answer fits this State."}
            </p>
            {finalOutcome.count > 0 && (
              // Every Candidate, in a box that scrolls once the list is long (the whole Answer List is 2315 words).
              <ul className="mt-2 grid max-h-64 grid-cols-[repeat(auto-fill,minmax(6ch,1fr))] content-start gap-x-2 gap-y-1 overflow-y-auto overscroll-contain border-y border-rule py-2 font-mono text-sm uppercase uppercase">
                {finalOutcome.words.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
          </>
        ) : null}
      </div>
    </WidgetFrame>
  );
}
