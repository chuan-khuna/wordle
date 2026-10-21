"use client";

import { ChevronRight } from "lucide-react";
import { Suspense, useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { type SolveResponse, type SplitResponse, getSolve, postSplit } from "@/lib/api";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";
import { pageText } from "@/lib/i18n/page-text";
import { answerGroup, statesPerRow } from "@/lib/widgets/split-groups";
import { WORD_LENGTH, parseMarks } from "@/lib/wordle/feedback";
import { POOLS, RANKS, SCOPES } from "@/lib/wordle/strategies";
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
          <GuessStrip data={data} step={step} go={go} lang={lang} />
          {!data.solved && <p className="text-sm text-error">{text.notSolved}</p>}
          <Row data={data} step={step} lang={lang} />
        </>
      )}
    </div>
  );
}

/**
 * The sticky strip: Prev and Next, then each Guess with its Feedback Marks as small Tiles. The current Guess is marked
 * (`aria-current="step"`); a Guess is a button that jumps to its row.
 */
function GuessStrip({ data, step, go, lang }: { data: SolveResponse; step: number; go: (n: number) => void; lang: Language }) {
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
      </div>
    </div>
  );
}

/** The row for `step`: its heading and `SplitGroups` of the Guess over the Candidate Set before it (asked of the API once per row). */
function Row({ data, step, lang }: { data: SolveResponse; step: number; lang: Language }) {
  const text = pageText(lang);
  const states = useMemo(() => statesPerRow(data), [data]);
  const shown = data.steps[step - 1];
  const rowKey = `${data.answer}|${data.steps[0].guess}|${step}|${data.steps.slice(0, step).map((s) => s.guess).join(",")}`;
  const [splits, setSplits] = useState<Record<string, SplitResponse>>({});
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const have = rowKey in splits;
  useEffect(() => {
    if (have) return;
    const ctl = new AbortController();
    postSplit(shown.guess, states[step - 1], ctl.signal).then(
      (split) => setSplits((prev) => ({ ...prev, [rowKey]: split })),
      (e: Error) => {
        if (e.name !== "AbortError") setFailure({ key: rowKey, message: e.message });
      },
    );
    return () => ctl.abort();
  }, [have, rowKey, shown.guess, states, step]);

  const split = splits[rowKey];
  const group = split && answerGroup(split, data.answer);
  const win = step === data.guesses && data.solved;
  return (
    <section aria-label={text.guessOf(step, data.guesses)} className="space-y-4">
      <h2 className="text-lg font-medium text-text">
        {win ? text.winHeading(step, shown.guess) : text.rowHeading(step, shown.guess, shown.candidates_before)}
      </h2>
      {split ? (
        <SplitGroups split={split} lang={lang} highlightCode={group?.code} highlightWord={data.answer} />
      ) : failure?.key === rowKey ? (
        <p role="alert" className="text-sm text-error">
          {failure.message}
        </p>
      ) : (
        <p className="text-sm text-meta">{text.splittingCandidates}</p>
      )}
    </section>
  );
}
