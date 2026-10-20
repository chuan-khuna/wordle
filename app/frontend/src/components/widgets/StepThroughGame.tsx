"use client";

import { Suspense, useEffect, useId, useState } from "react";
import { type Pool, type Rank, type Scope, type SolveResponse, getSolve } from "@/lib/api";
import { WORD_LENGTH, parseMarks } from "@/lib/feedback";
import { Tile } from "./Tile";
import { WidgetFrame, WordInput, cleanWord } from "./ui";
import { useWidgetParam } from "./useWidgetParam";

type Result = { key: string; data: SolveResponse | null; error: string | null };

const POOLS: Pool[] = ["guesses", "answers"];
const SCOPES: Scope[] = ["global", "candidates"];
const RANKS: Rank[] = ["bits", "expected"];
const oneOf = <T extends string>(value: string, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

/**
 * Widget 4: the Solver plays an Answer one Guess at a time (`GET /api/solve`).
 * Props: `answer`, `pool` ("guesses" | "answers", default guesses), `scope` ("global" | "candidates", default global),
 * `by` ("bits" | "expected", default bits), `step` (1-based Guess shown, default 1), `id`.
 * The defaults are the main Strategy: Expected Information over all Guesses. URL params of the same names
 * (`id.answer`, `id.step`, ...) override the props. Left and Right arrow keys step through the Game.
 */
export function StepThroughGame(props: {
  answer?: string;
  pool?: Pool;
  scope?: Scope;
  by?: Rank;
  step?: number;
  id?: string;
}) {
  return (
    <Suspense fallback={<WidgetFrame title="Step-through Game">Loading…</WidgetFrame>}>
      <Game {...props} />
    </Suspense>
  );
}

function Game({ answer: answerProp = "", pool: poolProp = "guesses", scope: scopeProp = "global", by: byProp = "bits", step: stepProp = 1, id }: {
  answer?: string;
  pool?: Pool;
  scope?: Scope;
  by?: Rank;
  step?: number;
  id?: string;
}) {
  const uid = useId();
  const [answer, setAnswer] = useWidgetParam(id, "answer", cleanWord(answerProp));
  const [poolText, setPool] = useWidgetParam(id, "pool", poolProp);
  const [scopeText, setScope] = useWidgetParam(id, "scope", scopeProp);
  const [byText, setBy] = useWidgetParam(id, "by", byProp);
  const [stepText, setStepText] = useWidgetParam(id, "step", String(stepProp));
  const pool = oneOf(poolText, POOLS, "guesses");
  const scope = oneOf(scopeText, SCOPES, "global");
  const by = oneOf(byText, RANKS, "bits");
  const a = cleanWord(answer);
  const ready = a.length === WORD_LENGTH;
  const key = `${a}|${pool}|${scope}|${by}`;

  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => {
    if (!ready) return;
    const ctl = new AbortController();
    const timer = setTimeout(() => {
      getSolve(a, pool, scope, by, ctl.signal).then(
        (data) => setResult({ key, data, error: null }),
        (e: Error) => {
          if (e.name !== "AbortError") setResult({ key, data: null, error: e.message });
        },
      );
    }, 250);
    return () => {
      clearTimeout(timer);
      ctl.abort();
    };
  }, [ready, a, pool, scope, by, key]);

  const current = ready && result?.key === key ? result : null;
  const data = current?.data ?? null;
  const total = data?.guesses ?? 0;
  const parsed = Number.parseInt(stepText, 10);
  const step = total === 0 ? 1 : Math.min(Math.max(Number.isFinite(parsed) ? parsed : 1, 1), total);
  const go = (n: number) => setStepText(String(Math.min(Math.max(n, 1), Math.max(total, 1))));
  const shown = data?.steps[step - 1];

  const onKeyDown = (e: React.KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t.tagName === "INPUT" || t.tagName === "SELECT" || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(step - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      go(step + 1);
    }
  };

  const select = "field text-base";
  const button = "btn";

  return (
    <WidgetFrame title="Step-through Game">
      <div onKeyDown={onKeyDown}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="col-span-2 lg:col-span-1">
            <WordInput id={`${uid}-a`} label="Answer" value={answer} onChange={setAnswer} />
          </div>
          <Select id={`${uid}-p`} label="Guesses from" value={pool} onChange={setPool} className={select} options={[["guesses", "all words"], ["answers", "Answers only"]]} />
          <Select id={`${uid}-s`} label="Search" value={scope} onChange={setScope} className={select} options={[["global", "all Guesses"], ["candidates", "Candidates only"]]} />
          <Select id={`${uid}-b`} label="Rank by" value={by} onChange={setBy} className={select} options={[["bits", "Expected Information"], ["expected", "Expected Candidates"]]} />
        </div>

        <div aria-live="polite" className="mt-3 min-h-6 text-sm">
          {!ready && <p className="text-meta">Type a five-letter Answer.</p>}
          {ready && !current && <p className="text-meta">The Solver is playing…</p>}
          {current?.error && (
            <p role="alert" className="text-error">
              {current.error}
            </p>
          )}
        </div>

        {data && shown && (
          <>
            <ol className="my-3 space-y-1.5" aria-label={`Guesses so far for ${data.answer}`}>
              {data.steps.slice(0, step).map((s) => (
                <li key={s.number} className="flex items-center gap-3">
                  <span className="w-6 text-right font-mono text-sm text-meta">{s.number}</span>
                  <span className="flex gap-1.5" role="group" aria-label={`Guess ${s.number}: ${s.guess}`}>
                    {[...s.guess].map((l, i) => (
                      <Tile key={i} letter={l} mark={parseMarks(s.marks)?.[i] ?? 0} />
                    ))}
                  </span>
                </li>
              ))}
            </ol>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={button} disabled={step <= 1} onClick={() => go(step - 1)} aria-label="Previous Guess">
                ← Prev
              </button>
              <button type="button" className={button} disabled={step >= total} onClick={() => go(step + 1)} aria-label="Next Guess">
                Next →
              </button>
              <span className="text-sm text-meta" aria-live="polite">
                Guess {step} of {total}
                {step === total && (data.solved ? ": solved" : ": not solved")}
              </span>
            </div>
            <p className="mt-1 text-xs text-meta">Left and Right arrow keys also step through the Game.</p>

            <p className="mt-3" aria-live="polite">
              Candidate Set: <strong className="font-mono text-text">{shown.candidates_before}</strong> →{" "}
              <strong className="font-mono text-text">{shown.candidates_after}</strong>{" "}
              <span className="text-meta">after {shown.guess.toUpperCase()}</span>
            </p>

            <div className="mt-3 overflow-x-auto">
              <table className="data-table min-w-[22rem] text-left">
                <caption className="eyebrow pb-2 text-left">The Solver&apos;s top Suggestions for Guess {step}</caption>
                <thead>
                  <tr>
                    <th scope="col">Guess</th>
                    <th scope="col" className="text-right">Bits</th>
                    <th scope="col" className="text-right">Expected Candidates</th>
                    <th scope="col">Candidate?</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.alternatives.map((w, i) => (
                    <tr key={w.word} className={i === 0 ? "bg-highlight-low font-semibold" : ""}>
                      <td className="font-mono uppercase">
                        {w.word}
                        {i === 0 && <span className="ml-2 text-xs font-normal normal-case text-meta">played</span>}
                      </td>
                      <td className="text-right font-mono">{w.bits.toFixed(2)}</td>
                      <td className="text-right font-mono">{w.expected_candidates.toFixed(1)}</td>
                      <td>{w.is_candidate ? "yes" : "no"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </WidgetFrame>
  );
}

function Select({
  id,
  label,
  value,
  onChange,
  options,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  className: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm text-meta">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={className}>
        {options.map(([v, name]) => (
          <option key={v} value={v}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}
