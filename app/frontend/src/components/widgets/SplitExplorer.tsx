"use client";

import { Suspense, useEffect, useId, useMemo, useState } from "react";
import { type SplitResponse, postSplit } from "@/lib/api";
import { WORD_LENGTH, parseMarks } from "@/lib/feedback";
import { parseState } from "@/lib/widget-state";
import { GroupChart } from "./GroupChart";
import { Tile } from "./Tile";
import { WidgetFrame, WordInput, cleanWord } from "./ui";
import { useWidgetParam } from "./useWidgetParam";

type Result = { key: string; data: SplitResponse | null; error: string | null };

const CHART_BARS = 30;
const WORDS_SHOWN = 60;
const fmt = (n: number, digits = 2) => n.toFixed(digits);

/**
 * Widget 3 (and 4, with bits): the Feedback Split of a Guess over the Candidate Set a State leaves.
 * A bar chart of the groups (one bar per Feedback, height = words in the group), the Expected Candidates,
 * and, unless `bits={false}`, the Expected Information. Select a bar or a row to see the group's words.
 * Props: `guess`, `state` ("crane:00102,slate:01200"), `bits` (default true), `id` (URL params `id.guess`, `id.state`).
 * URL params `guess` and `state` override the props.
 */
export function SplitExplorer(props: { guess?: string; state?: string; bits?: boolean; id?: string }) {
  return (
    <Suspense fallback={<WidgetFrame title="Feedback Split explorer">Loading…</WidgetFrame>}>
      <Explorer {...props} />
    </Suspense>
  );
}

function Explorer({ guess: guessProp = "", state: stateProp = "", bits = true, id }: { guess?: string; state?: string; bits?: boolean; id?: string }) {
  const uid = useId();
  const [guess, setGuess] = useWidgetParam(id, "guess", cleanWord(guessProp));
  const [stateText, setStateText] = useWidgetParam(id, "state", stateProp.trim());
  const g = cleanWord(guess);
  const turns = useMemo(
    () =>
      parseState(stateText)
        .filter((r) => r.guess.length === WORD_LENGTH)
        .map((r) => ({ guess: r.guess, feedback: r.marks.join("") })),
    [stateText],
  );
  const turnsKey = turns.map((t) => `${t.guess}:${t.feedback}`).join(",");
  const key = `${g}|${turnsKey}`;
  const ready = g.length === WORD_LENGTH;

  const [result, setResult] = useState<Result | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [showAllWords, setShowAllWords] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const ctl = new AbortController();
    const timer = setTimeout(() => {
      postSplit(g, turns, ctl.signal).then(
        (data) => {
          setResult({ key, data, error: null });
          setPicked(null);
          setShowAllWords(false);
        },
        (e: Error) => {
          if (e.name !== "AbortError") setResult({ key, data: null, error: e.message });
        },
      );
    }, 250);
    return () => {
      clearTimeout(timer);
      ctl.abort();
    };
    // `turns` is determined by `turnsKey`, which is part of `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, g, key]);

  const current = ready && result?.key === key ? result : null;
  const data = current?.data ?? null;
  const bars = useMemo(() => (data ? data.split.slice(0, CHART_BARS).map((s) => ({ marks: s.marks, count: s.count })) : []), [data]);
  const group = data?.split.find((s) => s.marks === picked) ?? null;
  const letters = data?.word ?? g;

  return (
    <WidgetFrame title="Feedback Split explorer">
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <WordInput id={`${uid}-g`} label="Guess" value={guess} onChange={setGuess} />
        <div>
          <label htmlFor={`${uid}-s`} className="mb-1 block text-sm text-meta">
            State (optional): <span className="font-mono">guess:feedback</span>, comma separated
          </label>
          <input
            id={`${uid}-s`}
            value={stateText}
            onChange={(e) => setStateText(e.target.value.toLowerCase().replace(/[^a-z0-9:,]/g, ""))}
            autoComplete="off"
            spellCheck={false}
            placeholder="crane:00102,slate:01200"
            className="field font-mono text-base"
          />
        </div>
      </div>

      <div aria-live="polite" className="mt-3 min-h-6 text-sm">
        {!ready && <p className="text-meta">Type a five-letter Guess.</p>}
        {ready && !current && <p className="text-meta">Splitting the Candidate Set…</p>}
        {current?.error && (
          <p role="alert" className="text-error">
            {current.error}
          </p>
        )}
      </div>

      {data && (
        <>
          <dl className="my-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {bits && <Stat label="Expected Information" value={`${fmt(data.bits)} bits`} big />}
            <Stat label="Expected Candidates" value={fmt(data.expected_candidates, 1)} big />
            <Stat label="Candidates now" value={String(data.candidates)} />
            <Stat label="Groups" value={`${data.groups} (largest ${data.largest_group})`} />
          </dl>

          <GroupChart
            bars={bars}
            selected={picked}
            onSelect={(m) => {
              setPicked(m);
              setShowAllWords(false);
            }}
            label={`Feedback Split of ${data.word}: words per Feedback group`}
          />
          <p className="mt-1 text-xs text-meta">
            {data.groups > CHART_BARS
              ? `The ${CHART_BARS} largest of ${data.groups} groups are drawn; the list below has all of them. `
              : ""}
            Bars are labelled with their Feedback (0 Absent, 1 Present, 2 Correct). Click a bar or a row to see its words.
          </p>

          <ul className="mt-5 max-h-64 divide-y divide-rule overflow-y-auto border-y border-rule" aria-label="Feedback groups">
            {data.split.map((s) => {
              const marks = parseMarks(s.marks) ?? [];
              const on = s.marks === picked;
              return (
                <li key={s.marks}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setPicked(on ? null : s.marks);
                      setShowAllWords(false);
                    }}
                    className={`flex w-full items-center gap-3 px-2 py-1.5 text-left cursor-pointer hover:bg-highlight-low focus-visible:-outline-offset-2 ${on ? "bg-highlight-low" : ""}`}
                  >
                    <span className="flex gap-1" aria-hidden>
                      {marks.map((m, i) => (
                        <Tile key={i} small letter={letters[i] ?? ""} mark={m} />
                      ))}
                    </span>
                    <span className="font-mono text-sm text-meta">{s.marks}</span>
                    <span className="ml-auto text-sm">
                      <strong className="font-mono text-text">{s.count}</strong> word{s.count === 1 ? "" : "s"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {group && (
            <div className="mt-3" aria-live="polite">
              <p className="text-sm">
                <span className="font-mono">{group.marks}</span>: {group.count} word{group.count === 1 ? "" : "s"}
              </p>
              <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-sm">
                {(showAllWords ? group.words : group.words.slice(0, WORDS_SHOWN)).map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
              {group.count > WORDS_SHOWN && (
                <button
                  type="button"
                  onClick={() => setShowAllWords((s) => !s)}
                  aria-expanded={showAllWords}
                  className="btn mt-2"
                >
                  {showAllWords ? "Show fewer" : `Show all ${group.count}`}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </WidgetFrame>
  );
}

function Stat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className={`mt-1 font-mono ${big ? "text-xl font-medium text-text" : "text-sm"}`}>{value}</dd>
    </div>
  );
}
