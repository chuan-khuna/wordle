"use client";

import { Suspense, useEffect, useId, useMemo, useState } from "react";
import { type SplitResponse, postSplit } from "@/lib/api";
import { WORD_LENGTH } from "@/lib/wordle/feedback";
import { rowsFromState } from "@/lib/widgets/state-board";
import { orderGroups } from "@/lib/widgets/split-chart";
import { formatState } from "@/lib/widgets/widget-state";
import { SplitChart } from "./SplitChart";
import { SplitWords } from "./SplitWords";
import { StateBoard } from "./StateBoard";
import { WidgetFrame } from "./ui";
import { WordRow, cleanWord } from "./WordRow";
import { useGuessCheck } from "./useGuessCheck";
import { useWidgetParam } from "./useWidgetParam";

type Result = { key: string; data: SplitResponse | null; error: string | null };

/**
 * Widget 3: the Feedback Split of a Guess over the Candidate Set a State leaves, in two columns.
 * Left, the gpui app's chart (SplitChart): one horizontal bar per Feedback, titled with the Expected Candidates
 * and the Expected Information. Right (SplitWords): the words of the selected Feedback (the largest group at first).
 * Props: `guess`, `state` ("crane:00102,slate:01200"), `id` (URL params `id.guess`, `id.state`).
 * URL params `guess` and `state` override the props.
 */
export function SplitExplorer(props: { guess?: string; state?: string; id?: string }) {
  return (
    <Suspense fallback={<WidgetFrame title="Feedback Split explorer">Loading…</WidgetFrame>}>
      <Explorer {...props} />
    </Suspense>
  );
}

function Explorer({ guess: guessProp = "", state: stateProp = "", id }: { guess?: string; state?: string; id?: string }) {
  const uid = useId();
  const [guess, setGuess] = useWidgetParam(id, "guess", cleanWord(guessProp));
  const [stateText, setStateText] = useWidgetParam(id, "state", formatState(rowsFromState(stateProp)));
  const g = cleanWord(guess);
  const rows = useMemo(() => rowsFromState(stateText), [stateText]);
  const turns = useMemo(() => rows.map((r) => ({ guess: r.guess, feedback: r.marks.join("") })), [rows]);
  const check = useGuessCheck(g);
  const turnsKey = turns.map((t) => `${t.guess}:${t.feedback}`).join(",");
  const key = `${g}|${turnsKey}`;
  const ready = g.length === WORD_LENGTH && !check.checking && !check.error;

  const [result, setResult] = useState<Result | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => {
    if (!ready) return;
    const ctl = new AbortController();
    const timer = setTimeout(() => {
      postSplit(g, turns, ctl.signal).then(
        (data) => {
          setResult({ key, data, error: null });
          setPicked(orderGroups(data.split)[0]?.marks ?? null);
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
  const group = data?.split.find((s) => s.marks === picked) ?? null;
  const letters = data?.word ?? g;

  return (
    <WidgetFrame title="Feedback Split explorer">
      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-[auto_1fr]">
        <WordRow id={`${uid}-g`} label="Guess" value={g} onChange={setGuess} error={check.error} />
        <div>
          <p className="mb-1.5 text-sm text-meta">State (optional): the Guesses so far and their Marks</p>
          <StateBoard rows={rows} onChange={(next) => setStateText(formatState(next))} label="State" />
        </div>
      </div>

      <div aria-live="polite" className="mt-3 min-h-6 text-sm">
        {g.length < WORD_LENGTH && <p className="text-meta">Type a five-letter Guess.</p>}
        {ready && !current && !check.error && <p className="text-meta">Splitting the Candidate Set…</p>}
        {current?.error && (
          <p role="alert" className="text-error">
            {current.error}
          </p>
        )}
      </div>

      {data && (
        <div className="@container">
          <div className="grid gap-x-8 gap-y-6 @2xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <SplitChart
              word={letters}
              groups={data.split}
              candidates={data.candidates}
              expectedCandidates={data.expected_candidates}
              bits={data.bits}
              selected={picked}
              onSelect={setPicked}
            />
            <div className="flex min-w-0 flex-col @2xl:relative">
              <div className="flex min-h-0 flex-1 flex-col @2xl:absolute @2xl:inset-0">
                <SplitWords key={group?.marks ?? ""} word={letters} group={group} candidates={data.candidates} />
              </div>
            </div>
          </div>
        </div>
      )}
    </WidgetFrame>
  );
}
