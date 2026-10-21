"use client";

import { Suspense, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { type SolveResponse, getSolve } from "@/lib/api";
import { WORD_LENGTH, parseMarks } from "@/lib/feedback";
import { MAX_BOARDS, MIN_BOARDS, beatsFor, nextStrategy, parseAnswers, parseBoards, revealed } from "@/lib/side-by-side";
import { RANKING_NAMES, STRATEGY_GROUPS, shortName, strategyById } from "@/lib/strategies";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tile } from "./Tile";
import { WidgetFrame } from "./ui";
import { WordRow } from "./WordRow";
import { useWidgetParam } from "./useWidgetParam";

// Six Guesses, as in the game (wordle.engine.game.MAX_GUESSES). Each board marks where they run out.
const GUESS_LIMIT = 6;

const DEFAULT_ANSWERS = "watch,goner,pound,wight,crane";
const DEFAULT_BOARDS = "bits-answers-candidates,bits-guesses-candidates,bits-guesses-all";

/** A Game played, or why it could not be: by `${answer}|${strategy id}`. */
type Played = { data: SolveResponse; error: null } | { data: null; error: string };

const gameKey = (answer: string, strategy: string) => `${answer}|${strategy}`;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (onChange: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
/** Whether the reader asked for reduced motion (false while rendering on the server). */
const useReducedMotion = () => useSyncExternalStore(subscribeMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => false);

/**
 * Widget 8: the Side-by-side Game. The Step-through Game for two to four Strategies at once: every board plays the
 * same Answer (`GET /api/solve`, one call per board), one Guess per beat on every board together, so the boards
 * that finish first stand out. After the longest Game and a short hold it moves to the next Answer, and after the
 * last Answer starts over. It plays while on screen; with `prefers-reduced-motion` it starts paused and the tiles do
 * not flip. Typing an Answer loops that one Answer.
 * Props: `answers` (comma separated, default "watch,goner,pound,wight,crane"), `strategies` (two to four Strategy
 * ids, comma separated, default Answer List with Candidates only, Guess List with Candidates only and Guess List
 * with All words, all ranked by Expected Information), `interval` (milliseconds per beat, default 900), `id`.
 * URL params of the same names (`id.answers`, ...) override the props.
 */
export function SideBySideGame(props: { answers?: string; strategies?: string; interval?: number; id?: string }) {
  return (
    <Suspense fallback={<WidgetFrame title="Side-by-side Game">Loading…</WidgetFrame>}>
      <SideBySide {...props} />
    </Suspense>
  );
}

function SideBySide({
  answers: answersProp = DEFAULT_ANSWERS,
  strategies: boardsProp = DEFAULT_BOARDS,
  interval: intervalProp = 900,
  id,
}: {
  answers?: string;
  strategies?: string;
  interval?: number;
  id?: string;
}) {
  const uid = useId();
  const [answersText, setAnswersText] = useWidgetParam(id, "answers", answersProp);
  const [boardsText, setBoardsText] = useWidgetParam(id, "strategies", boardsProp);
  const [intervalText] = useWidgetParam(id, "interval", String(intervalProp));
  const answers = parseAnswers(answersText, parseAnswers(answersProp, parseAnswers(DEFAULT_ANSWERS, [])));
  const boards = parseBoards(boardsText, parseBoards(boardsProp, parseBoards(DEFAULT_BOARDS, [])));
  const parsedInterval = Number.parseInt(intervalText, 10);
  const interval = Number.isFinite(parsedInterval) ? Math.min(Math.max(parsedInterval, 200), 5000) : 900;

  const [index, setIndex] = useState(0);
  const [beat, setBeat] = useState(0);
  // Unset until Play or Pause is pressed: then it plays, except with reduced motion, where Play still steps the
  // boards, without the flip.
  const [chosen, setPlaying] = useState<boolean | null>(null);
  const reducedMotion = useReducedMotion();
  const playing = chosen ?? !reducedMotion;
  const [visible, setVisible] = useState(false);
  const [typed, setTyped] = useState("");
  const [played, setPlayed] = useState<Record<string, Played>>({});
  const frame = useRef<HTMLDivElement>(null);

  const at = index % answers.length;
  const answer = answers[at];
  const games = boards.map((s) => played[gameKey(answer, s)]);
  const ready = games.every((g) => g !== undefined);
  const longest = Math.max(0, ...games.map((g) => g?.data?.guesses ?? 0));
  const done = ready && beat >= longest;

  // Play only while the boards are on screen.
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Play this Answer and the next on every board, each Game once.
  useEffect(() => {
    const ctl = new AbortController();
    const wanted = [answer, answers[(at + 1) % answers.length]].flatMap((a) => boards.map((s) => [a, s] as const));
    for (const [a, s] of wanted) {
      const strategy = strategyById(s);
      if (!strategy || played[gameKey(a, s)]) continue;
      getSolve(a, strategy.pool, strategy.scope, strategy.by, ctl.signal).then(
        (data) => setPlayed((p) => ({ ...p, [gameKey(a, s)]: { data, error: null } })),
        (e: Error) => {
          if (e.name !== "AbortError") setPlayed((p) => ({ ...p, [gameKey(a, s)]: { data: null, error: e.message } }));
        },
      );
    }
    return () => ctl.abort();
    // `played` is read only to skip Games already in; refetching on each arrival would abort the others.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answer, at, answers.join(","), boards.join(",")]);

  // One beat per interval: reveal a Guess on every board, then hold, then the next Answer.
  useEffect(() => {
    if (!playing || !visible || !ready) return;
    const timer = setTimeout(() => {
      if (beat + 1 >= beatsFor(longest)) {
        setIndex((i) => (i + 1) % answers.length);
        setBeat(0);
      } else setBeat(beat + 1);
    }, interval);
    return () => clearTimeout(timer);
  }, [playing, visible, ready, beat, longest, interval, answers.length]);

  const goTo = (i: number) => {
    setIndex((i + answers.length) % answers.length);
    setBeat(0);
  };
  const setBoards = (next: string[]) => {
    setBoardsText(next.join(","));
    setBeat(0);
  };

  return (
    <WidgetFrame title="Side-by-side Game">
      <WordRow
        id={`${uid}-a`}
        label="Answer"
        value={typed}
        onChange={(w) => {
          setTyped(w);
          if (w.length === WORD_LENGTH) {
            setAnswersText(w);
            goTo(0);
          }
        }}
        error={games.find((g) => g?.error)?.error}
      />
      <p className="mt-1 text-xs text-meta">
        Type an Answer to loop it, or leave it to play through the list. The number after a Guess is the Candidates it leaves.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={() => setPlaying(!playing)} aria-pressed={playing}>
          {playing ? "Pause" : "Play"}
        </Button>
        <Button onClick={() => goTo(at - 1)} disabled={answers.length < 2} aria-label="Previous Answer">
          ←
        </Button>
        <Button onClick={() => goTo(at + 1)} disabled={answers.length < 2} aria-label="Next Answer">
          →
        </Button>
        <Button onClick={() => setBeat(0)} aria-label="Play this Answer from the start">
          Restart
        </Button>
        <span className="text-sm text-meta">
          Answer {at + 1} of {answers.length}: <span className="font-mono text-text uppercase">{done ? answer : "?????"}</span>
        </span>
      </div>

      <div ref={frame} className="mt-4 grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-4 md:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
        {boards.map((s, b) => (
          <GameBoard
            key={s}
            strategy={s}
            boards={boards}
            game={games[b]}
            answer={answer}
            beat={beat}
            rows={Math.max(GUESS_LIMIT, longest)}
            onChange={(next) => setBoards(boards.map((x) => (x === s ? next : x)))}
            onRemove={boards.length > MIN_BOARDS ? () => setBoards(boards.filter((x) => x !== s)) : undefined}
          />
        ))}
      </div>

      {boards.length < MAX_BOARDS && (
        <Button
          className="mt-4"
          onClick={() => {
            const next = nextStrategy(boards);
            if (next) setBoards([...boards, next]);
          }}
        >
          Add a Strategy
        </Button>
      )}

      <p className="sr-only" aria-live="polite">
        {done &&
          `${answer}: ` +
            boards
              .map((s, b) => {
                const g = games[b]?.data;
                const outcome = !g ? "no Game" : g.guesses <= GUESS_LIMIT ? `solved in ${g.guesses}` : `lost, ${g.guesses} Guesses`;
                return `${strategyById(s)?.name}, ${outcome}`;
              })
              .join("; ")}
      </p>
    </WidgetFrame>
  );
}

function GameBoard({
  strategy,
  boards,
  game,
  answer,
  beat,
  rows,
  onChange,
  onRemove,
}: {
  strategy: string;
  boards: string[];
  game: Played | undefined;
  answer: string;
  beat: number;
  rows: number;
  onChange: (id: string) => void;
  onRemove?: () => void;
}) {
  const info = strategyById(strategy);
  const data = game?.data;
  const shown = data ? revealed(beat, data.guesses) : 0;
  const finished = !!data && shown === data.guesses;

  return (
    <figure className="m-0 min-w-0">
      <figcaption className="mb-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="eyebrow truncate">{info ? RANKING_NAMES[info.by] : ""}</span>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="cursor-pointer text-xs text-meta hover:text-text"
              aria-label={`Remove ${info?.name}`}
              title="Remove"
            >
              ✕
            </button>
          )}
        </div>
        <Select value={strategy} onValueChange={onChange}>
          <SelectTrigger size="sm" className="mt-1 px-2 text-xs sm:text-sm" aria-label="Strategy">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STRATEGY_GROUPS.map((g) => (
              <SelectGroup key={g.by}>
                <SelectLabel>{g.label}</SelectLabel>
                {g.strategies.map((s) => (
                  <SelectItem key={s.id} value={s.id} disabled={s.id !== strategy && boards.includes(s.id)}>
                    {shortName(s)}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </figcaption>

      <ol className="space-y-1" aria-label={`${info?.name}: Guesses so far`}>
        {Array.from({ length: rows }, (_, i) => {
          const step = i < shown ? data?.steps[i] : undefined;
          const marks = step ? parseMarks(step.marks) : null;
          return (
            <li key={i} className={`flex items-center gap-1 sm:gap-1.5 ${i === GUESS_LIMIT ? "mt-2 border-t border-dashed border-rule pt-2" : ""}`}>
              <span className="w-3 text-right font-mono text-[10px] text-meta">{i + 1}</span>
              {step && marks ? (
                <span className="flex gap-0.5 sm:gap-1" role="group" aria-label={`Guess ${i + 1}: ${step.guess}`}>
                  {[...step.guess].map((l, j) => (
                    // Keyed by Answer, so the next Answer's first row flips in again.
                    <span key={`${answer}-${j}`} className="animate-flip-in" style={{ animationDelay: `${j * 70}ms` }}>
                      <Tile letter={l} mark={marks[j]} board />
                    </span>
                  ))}
                </span>
              ) : (
                <span className="flex gap-0.5 sm:gap-1" aria-hidden>
                  {Array.from({ length: WORD_LENGTH }, (_, j) => (
                    <span key={j} className="inline-block h-6 w-6 rounded-sm border border-rule sm:h-7 sm:w-7" />
                  ))}
                </span>
              )}
              {step && <span className="ml-auto font-mono text-[10px] text-meta tabular-nums">{step.candidates_after}</span>}
            </li>
          );
        })}
      </ol>

      <p className="mt-2 min-h-5 text-sm" aria-hidden>
        {!game && <span className="text-meta">Playing…</span>}
        {game?.error && <span className="text-error">No Game</span>}
        {finished &&
          (data.guesses <= GUESS_LIMIT ? (
            <span className="font-medium text-text">Solved in {data.guesses}</span>
          ) : (
            <span className="font-medium text-error">Lost: {data.guesses} Guesses</span>
          ))}
      </p>
    </figure>
  );
}
