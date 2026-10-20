"use client";

import { Suspense, useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type SplitResponse, postSplit } from "@/lib/api";
import { WORD_LENGTH } from "@/lib/feedback";
import { parseState } from "@/lib/widget-state";
import { SplitChart } from "./SplitChart";
import { WidgetFrame, WordInput, cleanWord } from "./ui";
import { useWidgetParam } from "./useWidgetParam";

type Result = { key: string; data: SplitResponse | null; error: string | null };

const WORDS_SHOWN = 60;

/**
 * Widget 3 (and 4, with bits): the Feedback Split of a Guess over the Candidate Set a State leaves.
 * The gpui app's chart (SplitChart): one horizontal bar per Feedback, with the Expected Candidates and, unless
 * `bits={false}`, the Expected Information in its title. Select a bar to see the group's words.
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
  const group = data?.split.find((s) => s.marks === picked) ?? null;
  const letters = data?.word ?? g;

  return (
    <WidgetFrame title="Feedback Split explorer">
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <WordInput id={`${uid}-g`} label="Guess" value={guess} onChange={setGuess} />
        <div>
          <Label htmlFor={`${uid}-s`} className="mb-1 block text-sm font-normal text-meta">
            State (optional): <span className="font-mono">guess:feedback</span>, comma separated
          </Label>
          <Input
            id={`${uid}-s`}
            value={stateText}
            onChange={(e) => setStateText(e.target.value.toLowerCase().replace(/[^a-z0-9:,]/g, ""))}
            autoComplete="off"
            spellCheck={false}
            placeholder="crane:00102,slate:01200"
            className="font-mono"
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
          <SplitChart
            word={letters}
            groups={data.split}
            candidates={data.candidates}
            expectedCandidates={data.expected_candidates}
            bits={data.bits}
            showBits={bits}
            selected={picked}
            onSelect={(m) => {
              setPicked(m);
              setShowAllWords(false);
            }}
          />

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
                <Button
                  type="button"
                  onClick={() => setShowAllWords((s) => !s)}
                  aria-expanded={showAllWords}
                  className="mt-2"
                >
                  {showAllWords ? "Show fewer" : `Show all ${group.count}`}
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </WidgetFrame>
  );
}
