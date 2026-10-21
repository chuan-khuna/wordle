"use client";

import { ChevronRight } from "lucide-react";
import { RadioGroup } from "radix-ui";
import { Suspense, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { type SolveResponse, type SplitResponse, getSolve, postSplit } from "@/lib/api";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";
import { pageText } from "@/lib/i18n/page-text";
import { answerGroup, statesPerRow } from "@/lib/widgets/split-groups";
import { WORD_LENGTH, parseMarks } from "@/lib/wordle/feedback";
import { POOLS, RANKS, SCOPES } from "@/lib/wordle/strategies";
import { FollowGraph } from "./FollowGraph";
import { SplitGroups } from "./SplitGroups";
import { StrategyPicker } from "./StrategyPicker";
import { Tile } from "./Tile";
import { WordRow, cleanWord } from "./WordRow";
import { useWidgetParam } from "./useWidgetParam";

/** Article 08's Answer (the Step-through Game shows WATCH there too). */
const DEFAULT_ANSWER = "watch";

type Result = { key: string; data: SolveResponse | null; error: string | null };

const oneOf = <T extends string>(value: string, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

/**
 * The Follow an Answer page's content: the Answer, the Strategy and the Opener (URL params `answer`, `pool`, `scope`,
 * `by`, `opener`, `step`), one `GET /api/solve` for the Game, then `POST /api/split` for the row shown. Row k is
 * `SplitGroups` of Guess k over the Candidate Set before it, with the Answer's group outlined and the Answer in strong
 * text; the last row is the Win. A sticky strip lists the Guesses with their Feedback; Prev, Next and the Guesses change `step`.
 * `view=graph` shows the whole Game as a chain instead (`FollowGraph`), from the splits of every row.
 */
export function Follow({ lang = DEFAULT_LANGUAGE }: { lang?: Language }) {
  return (
    <Suspense fallback={<p className="text-sm text-meta">{pageText(lang).solverPlaying}</p>}>
      <Game lang={lang} />
    </Suspense>
  );
}

function Game({ lang }: { lang: Language }) {
  const text = pageText(lang);
  const uid = useId();
  const [answer, setAnswer] = useWidgetParam(undefined, "answer", DEFAULT_ANSWER);
  const [poolText, setPool] = useWidgetParam(undefined, "pool", "guesses");
  const [scopeText, setScope] = useWidgetParam(undefined, "scope", "global");
  const [byText, setBy] = useWidgetParam(undefined, "by", "bits");
  const [openerText, setOpener] = useWidgetParam(undefined, "opener", "");
  const [stepText, setStepText] = useWidgetParam(undefined, "step", "1");
  const [viewText, setView] = useWidgetParam(undefined, "view", "rows");
  const view = oneOf(viewText, ["rows", "graph"], "rows");
  const pool = oneOf(poolText, POOLS, "guesses");
  const scope = oneOf(scopeText, SCOPES, "global");
  const by = oneOf(byText, RANKS, "bits");
  const a = cleanWord(answer);
  const o = cleanWord(openerText);
  // Untouched, the Opener is the Strategy's best (the API picks it). Once typed in, it is the word in the box, even if emptied again.
  const [custom, setCustom] = useState(o !== "");
  const opener = custom ? o : "";
  const ready = a.length === WORD_LENGTH && (!custom || o.length === WORD_LENGTH);
  const key = `${a}|${pool}|${scope}|${by}|${opener}`;

  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => {
    if (!ready) return;
    const ctl = new AbortController();
    const timer = setTimeout(() => {
      getSolve(a, pool, scope, by, ctl.signal, opener || undefined).then(
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
  }, [ready, a, pool, scope, by, opener, key]);

  const current = ready && result?.key === key ? result : null;
  const data = current?.data ?? null;
  const total = data?.guesses ?? 0;
  const parsed = Number.parseInt(stepText, 10);
  const step = total === 0 ? 1 : Math.min(Math.max(Number.isFinite(parsed) ? parsed : 1, 1), total);
  const go = (n: number) => setStepText(String(Math.min(Math.max(n, 1), Math.max(total, 1))));
  const shown = data?.steps[step - 1];
  const rowSplits = useRowSplits(data, view === "graph" ? Array.from({ length: total }, (_, k) => k + 1) : [step]);

  // The API's message belongs to the input it is about.
  const openerError = current?.error?.startsWith("opener") ? current.error : null;
  const answerError = current?.error && !openerError ? current.error : null;
  const best = !custom && data ? data.steps[0].guess : "";

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <WordRow id={`${uid}-answer`} label={text.answerLabel} value={a} onChange={setAnswer} error={answerError} />
        <StrategyPicker
          lang={lang}
          value={{ pool, scope, by }}
          onChange={(next) => {
            setPool(next.pool);
            setScope(next.scope);
            setBy(next.by);
          }}
        />
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <WordRow
            id={`${uid}-opener`}
            label={text.openerLabel}
            value={custom ? o : best}
            onChange={(word) => {
              setCustom(true);
              setOpener(word);
            }}
            error={openerError}
            hint={custom ? undefined : best ? text.bestOpenerHint : undefined}
          />
          {custom && (
            <Button
              type="button"
              variant="default"
              onClick={() => {
                setCustom(false);
                setOpener("");
              }}
            >
              {text.useBestOpener}
            </Button>
          )}
        </div>
        <div aria-live="polite" className="min-h-6 text-sm">
          {a.length < WORD_LENGTH && <p className="text-meta">{text.typeAnswer}</p>}
          {a.length === WORD_LENGTH && custom && o.length < WORD_LENGTH && <p className="text-meta">{text.typeOpener}</p>}
          {ready && !current && <p className="text-meta">{text.solverPlaying}</p>}
        </div>
      </div>

      {data && shown && (
        <>
          <GuessStrip data={data} step={step} go={go} lang={lang} view={view} setView={setView} />
          {!data.solved && <p className="text-sm text-error">{text.notSolved}</p>}
          {view === "graph" ? (
            <Graph
              data={data}
              step={step}
              lang={lang}
              rowSplits={rowSplits}
              onPick={(n) => {
                go(n);
                setView("rows");
              }}
            />
          ) : (
            <Row data={data} step={step} lang={lang} rowSplits={rowSplits} />
          )}
        </>
      )}
    </div>
  );
}

/**
 * The sticky strip: Prev and Next, then each Guess with its Feedback Marks as small Tiles. The current Guess is marked
 * (`aria-current="step"`); a Guess is a button that jumps to its row.
 */
function GuessStrip({
  data,
  step,
  go,
  lang,
  view,
  setView,
}: {
  data: SolveResponse;
  step: number;
  go: (n: number) => void;
  lang: Language;
  view: string;
  setView: (v: string) => void;
}) {
  const text = pageText(lang);
  const total = data.guesses;
  return (
    <div className="sticky top-0 z-10 -mx-gutter border-b border-rule bg-background px-gutter py-2 sm:-mx-gutter-wide sm:px-gutter-wide">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <Button disabled={step <= 1} onClick={() => go(step - 1)} aria-label={text.prevGuess}>
            ← {text.prev}
          </Button>
          <Button disabled={step >= total} onClick={() => go(step + 1)} aria-label={text.nextGuess}>
            {text.next} →
          </Button>
        </div>
        <ol aria-label={text.guessStripLabel(data.answer)} className="flex flex-wrap items-center gap-y-1">
          {data.steps.map((s) => (
            <li key={s.number} className="flex items-center">
              {s.number > 1 && <ChevronRight className="size-4 text-meta" aria-hidden />}
              <button
                type="button"
                aria-current={s.number === step ? "step" : undefined}
                aria-label={text.jumpToGuess(s.number, s.guess)}
                onClick={() => go(s.number)}
                className={`flex cursor-pointer gap-0.5 rounded-xs p-1 hover:bg-highlight-low ${s.number === step ? "bg-highlight-med outline-2 outline-offset-0 outline-accent" : ""}`}
              >
                {[...s.guess].map((l, i) => (
                  <Tile key={i} letter={l} mark={parseMarks(s.marks)?.[i] ?? 0} tiny />
                ))}
              </button>
            </li>
          ))}
        </ol>
        <span className="text-sm text-meta" aria-live="polite">
          {text.guessOf(step, total)}
        </span>
        <RadioGroup.Root
          aria-label={text.viewLabel}
          orientation="horizontal"
          value={view}
          onValueChange={setView}
          className="inline-flex gap-0.5 rounded-sm border border-rule p-0.5 sm:ml-auto"
        >
          {(["rows", "graph"] as const).map((v) => (
            <RadioGroup.Item
              key={v}
              value={v}
              className="cursor-pointer rounded-xs px-2.5 py-1 text-sm whitespace-nowrap text-meta hover:bg-highlight-low hover:text-text data-[state=checked]:bg-highlight-med data-[state=checked]:text-text"
            >
              {v === "rows" ? text.viewRows : text.viewGraph}
            </RadioGroup.Item>
          ))}
        </RadioGroup.Root>
      </div>
    </div>
  );
}

type RowSplits = { splits: Record<string, SplitResponse>; failures: Record<string, string>; keyOf: (n: number) => string };

/**
 * The splits of the rows in `steps` (1-based), kept in a cache by row so that a row, or the graph, never asks twice.
 * Row k is the split of Guess k over the State before it, so its key holds the Guesses up to k only. Missing rows are
 * asked of `POST /api/split` in parallel.
 */
function useRowSplits(data: SolveResponse | null, steps: number[]): RowSplits {
  const [splits, setSplits] = useState<Record<string, SplitResponse>>({});
  const [failures, setFailures] = useState<Record<string, string>>({});
  const keyOf = (n: number) => (data ? `${data.answer}|${data.steps.slice(0, n).map((s) => s.guess).join(",")}` : "");
  const have = steps.filter((n) => keyOf(n) in splits).join(",");
  const wanted = steps.join(",");
  useEffect(() => {
    if (!data) return;
    const ctl = new AbortController();
    const states = statesPerRow(data);
    for (const n of wanted.split(",").filter(Boolean).map(Number)) {
      const key = keyOf(n);
      if (key in splits) continue;
      postSplit(data.steps[n - 1].guess, states[n - 1], ctl.signal).then(
        (split) => setSplits((prev) => ({ ...prev, [key]: split })),
        (e: Error) => {
          if (e.name !== "AbortError") setFailures((prev) => ({ ...prev, [key]: e.message }));
        },
      );
    }
    return () => ctl.abort();
    // `splits` is read only through `have`, so a split arriving does not restart the others.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, wanted, have]);
  return { splits, failures, keyOf };
}

/** The graph: the Answer's group of every row. */
function Graph({ data, step, lang, rowSplits, onPick }: { data: SolveResponse; step: number; lang: Language; rowSplits: RowSplits; onPick: (n: number) => void }) {
  const groups = data.steps.map((s) => {
    const split = rowSplits.splits[rowSplits.keyOf(s.number)];
    return split && answerGroup(split, data.answer);
  });
  const failure = data.steps.map((s) => rowSplits.failures[rowSplits.keyOf(s.number)]).find(Boolean);
  return (
    <div className="space-y-4">
      <FollowGraph data={data} groups={groups} step={step} onPick={onPick} lang={lang} />
      {failure && (
        <p role="alert" className="text-sm text-error">
          {failure}
        </p>
      )}
    </div>
  );
}

/** The row for `step`: its heading and `SplitGroups` of the Guess over the Candidate Set before it. */
function Row({ data, step, lang, rowSplits }: { data: SolveResponse; step: number; lang: Language; rowSplits: RowSplits }) {
  const text = pageText(lang);
  const shown = data.steps[step - 1];
  const rowKey = rowSplits.keyOf(step);
  const split = rowSplits.splits[rowKey];
  const group = split && answerGroup(split, data.answer);
  const win = step === data.guesses && data.solved;
  return (
    <section aria-label={text.guessOf(step, data.guesses)} className="space-y-4">
      <h2 className="text-lg font-medium text-text">
        {win ? text.winHeading(step, shown.guess) : text.rowHeading(step, shown.guess, shown.candidates_before)}
      </h2>
      {split ? (
        <SplitGroups split={split} lang={lang} highlightCode={group?.code} highlightWord={data.answer} />
      ) : rowSplits.failures[rowKey] ? (
        <p role="alert" className="text-sm text-error">
          {rowSplits.failures[rowKey]}
        </p>
      ) : (
        <p className="text-sm text-meta">{text.splittingCandidates}</p>
      )}
    </section>
  );
}
