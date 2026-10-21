"use client";

import { Suspense, useEffect, useId, useState } from "react";
import { getFeedback } from "@/lib/api";
import { MARK_NAMES, WORD_LENGTH, marksToString, traceFeedback } from "@/lib/wordle/feedback";
import { Tile } from "./Tile";
import { WidgetFrame } from "./ui";
import { WordRow, cleanWord } from "./WordRow";
import { useGuessCheck } from "./useGuessCheck";
import { useWidgetParam } from "./useWidgetParam";

type Check = { key: string; error: string | null; marks: string | null };

/**
 * Widget 1: type a Guess and an Answer, see the five Marks and the two-pass repeated-letter rule worked
 * out for that pair. The Marks are scored locally (lib/feedback.ts); /api/feedback validates the words
 * against the Guess List and cross-checks the Marks.
 * Props: `guess`, `answer` (starting words), `id` (namespaces the URL params `id.guess`, `id.answer`).
 */
export function FeedbackScorer(props: { guess?: string; answer?: string; id?: string }) {
  return (
    <Suspense fallback={<WidgetFrame title="Feedback scorer">Loading…</WidgetFrame>}>
      <Scorer {...props} />
    </Suspense>
  );
}

function Scorer({ guess: guessProp = "", answer: answerProp = "", id }: { guess?: string; answer?: string; id?: string }) {
  const uid = useId();
  const [guess, setGuess] = useWidgetParam(id, "guess", cleanWord(guessProp));
  const [answer, setAnswer] = useWidgetParam(id, "answer", cleanWord(answerProp));
  const g = cleanWord(guess);
  const a = cleanWord(answer);
  const ready = g.length === WORD_LENGTH && a.length === WORD_LENGTH;
  const key = `${g}|${a}`;
  // Each word is checked against the Guess List on its own, so the message sits under the right row.
  const guessCheck = useGuessCheck(g);
  const answerCheck = useGuessCheck(a);
  const wordsOk = ready && !guessCheck.checking && !answerCheck.checking && !guessCheck.error && !answerCheck.error;

  const [check, setCheck] = useState<Check | null>(null);
  useEffect(() => {
    if (!wordsOk) return;
    const ctl = new AbortController();
    const timer = setTimeout(() => {
      getFeedback(g, a, ctl.signal).then(
        (r) => setCheck({ key, error: null, marks: r.marks }),
        (e: Error) => {
          if (e.name !== "AbortError") setCheck({ key, error: e.message, marks: null });
        },
      );
    }, 250);
    return () => {
      clearTimeout(timer);
      ctl.abort();
    };
  }, [wordsOk, g, a, key]);

  // The Marks are worked out here at once; the API only vouches for the words and cross-checks them.
  const trace = ready && !guessCheck.error && !answerCheck.error ? traceFeedback(g, a) : null;
  const current = wordsOk && check?.key === key ? check : null;
  const localMarks = trace ? marksToString(trace.marks) : null;

  return (
    <WidgetFrame title="Feedback scorer">
      <div className="grid gap-3 sm:grid-cols-2">
        <WordRow id={`${uid}-g`} label="Guess" value={g} onChange={setGuess} error={guessCheck.error} />
        <WordRow id={`${uid}-a`} label="Answer" value={a} onChange={setAnswer} error={answerCheck.error} />
      </div>

      <div aria-live="polite" className="mt-3 min-h-6 text-sm">
        {!ready && <p className="text-meta">Type a five-letter Guess and Answer.</p>}
        {ready && !current && !guessCheck.error && !answerCheck.error && <p className="text-meta">Checking the words…</p>}
        {current?.error && (
          <p role="alert" className="text-error">
            {current.error}
          </p>
        )}
        {current && !current.error && current.marks !== localMarks && (
          <p role="alert" className="text-error">
            The server scored this pair as {current.marks}, not {localMarks}.
          </p>
        )}
      </div>

      {trace && (
        <>
          <div className="my-3 flex gap-1.5" role="group" aria-label={`Feedback for ${g} against ${a}`}>
            {[...g].map((letter, i) => (
              <Tile key={i} letter={letter} mark={trace.marks[i]} />
            ))}
          </div>
          <div className="space-y-3 text-sm leading-relaxed">
            <p className="text-meta">
              Each letter of the Answer can pay for only one Mark, and Correct Marks are given out first.
            </p>
            <div>
              <p className="font-medium text-text">Pass 1: Correct</p>
              <p>
                Compare position by position.{" "}
                {trace.correct.some(Boolean)
                  ? `Correct: ${[...g]
                      .map((l, i) => (trace.correct[i] ? `${l.toUpperCase()} (position ${i + 1})` : null))
                      .filter(Boolean)
                      .join(", ")}.`
                  : "No letter is in the same place in both words."}{" "}
                {Object.keys(trace.unused).length > 0
                  ? `Answer letters left unused: ${Object.entries(trace.unused)
                      .map(([l, n]) => `${l.toUpperCase()}${n > 1 ? ` ×${n}` : ""}`)
                      .join(", ")}.`
                  : "Every Answer letter is used."}
              </p>
            </div>
            <div>
              <p className="font-medium text-text">Pass 2: Present, left to right</p>
              {trace.steps.length === 0 ? (
                <p>Nothing left to do: every letter is Correct.</p>
              ) : (
                <ol className="list-decimal space-y-1 pl-5">
                  {trace.steps.map((s) => (
                    <li key={s.index}>
                      Position {s.index + 1}, {s.letter.toUpperCase()}:{" "}
                      {s.available > 0
                        ? `the Answer has ${s.available} unused ${s.letter.toUpperCase()}, so it is ${MARK_NAMES[1]} and one copy is used up.`
                        : `the Answer has no unused ${s.letter.toUpperCase()}, so it is ${MARK_NAMES[0]}.`}
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <p>
              Feedback: <span className="font-mono">{localMarks}</span> (0 Absent, 1 Present, 2 Correct)
            </p>
          </div>
        </>
      )}
    </WidgetFrame>
  );
}
