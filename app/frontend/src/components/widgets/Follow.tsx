"use client";

import { Maximize2 } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { ControlPanel } from "@/components/controls/ControlPanel";
import { SegmentedControl } from "@/components/controls/SegmentedControl";
import { Button } from "@/components/ui/button";
import { type SolveResponse, type SplitResponse, postSplit } from "@/lib/api";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";
import { pageText } from "@/lib/i18n/page-text";
import { answerGroup, statesPerRow } from "@/lib/widgets/split-groups";
import { FitOverlay, useLg } from "./_components/FitOverlay";
import { FollowPath } from "./_components/FollowPath";
import { GuessStrip } from "./_components/GuessStrip";
import { GameInputs, oneOf, useSolverGame } from "./_components/SolverGame";
import { SplitGroups } from "./_components/SplitGroups";
import { useWidgetParam } from "./_components/useWidgetParam";

/**
 * The Follow an Answer page's content: the Answer, the Strategy and the Opener (URL params `answer`, `pool`, `scope`,
 * `by`, `opener`, `step`), one `GET /api/solve` for the Game, then `POST /api/split` for the row shown. Row k is
 * `SplitGroups` of Guess k over the Candidate Set before it, with the Answer's group outlined and the Answer in strong
 * text; the last row is the Win. A sticky strip lists the Guesses with their Feedback; Prev, Next and the Guesses change `step`.
 * `view=path` (an old `view=graph` too) shows the Answer's path, the whole Game as a chain, instead (`FollowPath`), from the splits of every row.
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
  const game = useSolverGame();
  const [stepText, setStepText] = useWidgetParam(undefined, "step", "1");
  const [viewText, setView] = useWidgetParam(undefined, "view", "split");
  const view = oneOf(viewText === "graph" ? "path" : viewText, ["split", "path"], "split");
  const [fit, setFit] = useWidgetParam(undefined, "fit", "");
  const lg = useLg();

  const data = game.data;
  const total = data?.guesses ?? 0;
  const parsed = Number.parseInt(stepText, 10);
  const step = total === 0 ? 1 : Math.min(Math.max(Number.isFinite(parsed) ? parsed : 1, 1), total);
  const go = (n: number) => setStepText(String(Math.min(Math.max(n, 1), Math.max(total, 1))));
  const shown = data?.steps[step - 1];
  const rowSplits = useRowSplits(data, view === "path" ? Array.from({ length: total }, (_, k) => k + 1) : [step]);
  const best = !game.custom && data ? data.steps[0].guess : "";

  return (
    <ControlPanel plain className="space-y-6">
      <GameInputs game={game} best={best} lang={lang} />

      {data && shown && (
        <>
          <GuessStrip data={data} step={step} first={1} go={go} lang={lang} status={text.guessOf(step, total)}>
            <SegmentedControl
              label={text.viewLabel}
              value={view}
              onChange={setView}
              options={["split", "path"] as const}
              names={{ split: text.viewSplit, path: text.viewPath }}
              className="sm:ml-auto"
            />
          </GuessStrip>
          {!data.solved && <p className="text-sm text-error">{text.notSolved}</p>}
          {view === "path" ? (
            <Path
              data={data}
              step={step}
              lang={lang}
              rowSplits={rowSplits}
              fitted={fit === "1" && lg}
              setFitted={(on) => setFit(on ? "1" : "")}
              onPick={(n) => {
                go(n);
                setView("split");
                setFit("");
              }}
            />
          ) : (
            <Row data={data} step={step} lang={lang} rowSplits={rowSplits} />
          )}
        </>
      )}
    </ControlPanel>
  );
}

type RowSplits = { splits: Record<string, SplitResponse>; failures: Record<string, string>; keyOf: (n: number) => string };

/**
 * The splits of the rows in `steps` (1-based), kept in a cache by row so that a row, or the path, never asks twice.
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

/**
 * The path: the Answer's group of every row, with a Full screen button (from `lg`; URL param `fit=1`) that shows it in
 * a `FitOverlay` instead, laid out at the overlay's width and scaled to the window.
 */
function Path({
  data,
  step,
  lang,
  rowSplits,
  fitted,
  setFitted,
  onPick,
}: {
  data: SolveResponse;
  step: number;
  lang: Language;
  rowSplits: RowSplits;
  fitted: boolean;
  setFitted: (on: boolean) => void;
  onPick: (n: number) => void;
}) {
  const text = pageText(lang);
  const groups = data.steps.map((s) => {
    const split = rowSplits.splits[rowSplits.keyOf(s.number)];
    return split && answerGroup(split, data.answer);
  });
  const failure = data.steps.map((s) => rowSplits.failures[rowSplits.keyOf(s.number)]).find(Boolean);
  return (
    <div className="space-y-4">
      <div className="hidden justify-end lg:flex">
        <Button type="button" aria-pressed={fitted} onClick={() => setFitted(!fitted)} className="aria-pressed:bg-highlight-med">
          <Maximize2 aria-hidden="true" />
          {text.fullScreen}
        </Button>
      </div>
      {fitted ? (
        <FitOverlay
          title={data.answer}
          label={text.fullScreen}
          closeLabel={text.closeFullScreen}
          // Re-fit as each row's split arrives: a node's words change its size.
          contentKey={`${data.steps.map((s) => s.guess).join(" ")}|${groups.filter(Boolean).length}`}
          content={groups}
          onExit={() => setFitted(false)}
        >
          {(layoutW) => <FollowPath data={data} groups={groups} step={step} onPick={onPick} lang={lang} layoutWidth={layoutW} />}
        </FitOverlay>
      ) : (
        <FollowPath data={data} groups={groups} step={step} onPick={onPick} lang={lang} />
      )}
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
    <section aria-label={text.guessOf(step, data.guesses)} className="space-y-4 font-sans">
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
