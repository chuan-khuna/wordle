"use client";

import { useEffect, useId, useState } from "react";
import { ControlPanel } from "@/components/controls/ControlPanel";
import { Field } from "@/components/controls/Field";
import { Button } from "@/components/ui/button";
import { type Pool, type Rank, type Scope, type SolveResponse, getSolve } from "@/lib/api";
import type { Language } from "@/lib/i18n/language";
import { pageText } from "@/lib/i18n/page-text";
import { WORD_LENGTH } from "@/lib/wordle/feedback";
import { POOLS, RANKS, SCOPES } from "@/lib/wordle/strategies";
import { StrategyPicker } from "./StrategyPicker";
import { WordRow, cleanWord } from "./WordRow";
import { useWidgetParam } from "./useWidgetParam";

/** Article 08's Answer (the Step-through Game shows WATCH there too). */
export const DEFAULT_ANSWER = "watch";

/** The label of a word field with tiles: level with the tiles from `sm`, not the middle of the field (error and hint sit under them). */
const WORD_LABEL = "sm:h-14";

type Result = { key: string; data: SolveResponse | null; error: string | null };

/** `value` if it is one of `allowed`, else `fallback`. */
export const oneOf = <T extends string>(value: string, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

/** The Solver's Game for the Answer, Strategy and Opener in the URL, and the inputs' state. See `useSolverGame`. */
export interface SolverGame {
  /** The Answer and the Opener as typed (cleaned). */
  answer: string;
  opener: string;
  pool: Pool;
  scope: Scope;
  by: Rank;
  /** Whether the Opener was typed in; untouched, it is the Strategy's best. */
  custom: boolean;
  /** Whether the inputs make a Game to ask for (a five-letter Answer, and Opener if typed in). */
  ready: boolean;
  /** The Game for the inputs as they are now: null while it is asked for, or when it failed. */
  data: SolveResponse | null;
  /** Whether the Game for the inputs as they are now has been answered (with a Game or an error). */
  answered: boolean;
  /** The last Game the API gave, for any inputs: kept while new inputs are asked for or rejected. */
  lastGood: SolveResponse | null;
  /** The API's message, put on the input it is about. */
  answerError: string | null;
  openerError: string | null;
  setAnswer: (word: string) => void;
  setStrategy: (next: { pool: Pool; scope: Scope; by: Rank }) => void;
  setOpener: (word: string) => void;
  /** Go back to the Strategy's best Opener. */
  resetOpener: () => void;
}

/**
 * The Answer, the Strategy and the Opener (URL params `answer`, `pool`, `scope`, `by`, `opener`), and one
 * `GET /api/solve` for the Game, asked 250 ms after the last change (aborting the one before). The Opener untouched is
 * the Strategy's best (the API picks it); once typed in, it is the word in the box, even if emptied again.
 * Needs a `<Suspense>` boundary above it (the URL params).
 */
export function useSolverGame(): SolverGame {
  const [answerText, setAnswer] = useWidgetParam(undefined, "answer", DEFAULT_ANSWER);
  const [poolText, setPool] = useWidgetParam(undefined, "pool", "guesses");
  const [scopeText, setScope] = useWidgetParam(undefined, "scope", "global");
  const [byText, setBy] = useWidgetParam(undefined, "by", "bits");
  const [openerText, setOpenerText] = useWidgetParam(undefined, "opener", "");
  const pool = oneOf(poolText, POOLS, "guesses");
  const scope = oneOf(scopeText, SCOPES, "global");
  const by = oneOf(byText, RANKS, "bits");
  const a = cleanWord(answerText);
  const o = cleanWord(openerText);
  const [custom, setCustom] = useState(o !== "");
  const opener = custom ? o : "";
  const ready = a.length === WORD_LENGTH && (!custom || o.length === WORD_LENGTH);
  const key = `${a}|${pool}|${scope}|${by}|${opener}`;

  const [result, setResult] = useState<Result | null>(null);
  const [lastGood, setLastGood] = useState<SolveResponse | null>(null);
  useEffect(() => {
    if (!ready) return;
    const ctl = new AbortController();
    const timer = setTimeout(() => {
      getSolve(a, pool, scope, by, ctl.signal, opener || undefined).then(
        (data) => {
          setResult({ key, data, error: null });
          setLastGood(data);
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
  }, [ready, a, pool, scope, by, opener, key]);

  const current = ready && result?.key === key ? result : null;
  // The API's message belongs to the input it is about.
  const openerError = current?.error?.startsWith("opener") ? current.error : null;
  const answerError = current?.error && !openerError ? current.error : null;
  return {
    answer: a,
    opener: o,
    pool,
    scope,
    by,
    custom,
    ready,
    data: current?.data ?? null,
    answered: current !== null,
    lastGood,
    answerError,
    openerError,
    setAnswer,
    setStrategy: (next) => {
      setPool(next.pool);
      setScope(next.scope);
      setBy(next.by);
    },
    setOpener: (word) => {
      setCustom(true);
      setOpenerText(word);
    },
    resetOpener: () => {
      setCustom(false);
      setOpenerText("");
    },
  };
}

/**
 * The Game's inputs: the Answer (a `WordRow`), the `StrategyPicker` and the Opener (a `WordRow` showing the Strategy's
 * best, `best`, until another word is typed, with a Best Opener button to go back), then a line saying what is missing
 * or that the Solver is playing. The API's message shows under the input it is about.
 */
export function GameInputs({ game, best, lang }: { game: SolverGame; best: string; lang: Language }) {
  const text = pageText(lang);
  const uid = useId();
  const { answer: a, opener: o, custom } = game;
  return (
    <ControlPanel plain className="space-y-4">
      <Field layout="inline" label={text.answerLabel} htmlFor={`${uid}-answer`} labelClassName={WORD_LABEL}>
        <WordRow id={`${uid}-answer`} label={text.answerLabel} hideLabel value={a} onChange={game.setAnswer} error={game.answerError} />
      </Field>
      <StrategyPicker lang={lang} value={{ pool: game.pool, scope: game.scope, by: game.by }} onChange={game.setStrategy} />
      <Field layout="inline" label={text.openerLabel} htmlFor={`${uid}-opener`} labelClassName={WORD_LABEL} className="sm:items-start">
        <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
          <WordRow
            id={`${uid}-opener`}
            label={text.openerLabel}
            hideLabel
            value={custom ? o : best}
            onChange={game.setOpener}
            error={game.openerError}
            hint={custom ? undefined : best ? text.bestOpenerHint : undefined}
          />
          {custom && (
            <Button type="button" variant="default" onClick={game.resetOpener}>
              {text.useBestOpener}
            </Button>
          )}
        </div>
      </Field>
      <div aria-live="polite" className="min-h-6">
        {a.length < WORD_LENGTH && <p className="text-meta">{text.typeAnswer}</p>}
        {a.length === WORD_LENGTH && custom && o.length < WORD_LENGTH && <p className="text-meta">{text.typeOpener}</p>}
        {game.ready && !game.answered && <p className="text-meta">{text.solverPlaying}</p>}
      </div>
    </ControlPanel>
  );
}
