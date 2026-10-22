"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { checkGuess } from "@/lib/api";
import { WORD_LENGTH } from "@/lib/wordle/feedback";
import { backspace, canType, cycleMark, enterGuess, isWin, startOver, typeLetter } from "@/lib/widgets/state-board";
import { type Row } from "@/lib/widgets/widget-state";
import { Tile } from "./Tile";
import { WordRow } from "./WordRow";
import { useGuessCheck } from "./useGuessCheck";

/**
 * A State input like the gpui app's Solver mode: Guesses as rows of tiles, and a typing row under them.
 *
 * - Type a Guess and press Enter: it must be on the Guess List (asked of the API), and its tiles start Absent.
 * - Click, tap, or press Space or Enter on a tile: Absent, Present, Correct, Absent.
 * - Backspace with nothing typed takes the last Guess back into the typing row. Up to six Guesses; a row that is
 *   all Correct is a Win and stops input. "Start over" clears everything.
 *
 * Controlled by `rows` (the State; the parent keeps it, e.g. in the URL). The Guess being typed is the board's own.
 * `renderRowEnd` adds something beside each row (the Candidate filter's before and after counts).
 */
export function StateBoard({
  rows,
  onChange,
  label = "State",
  renderRowEnd,
}: {
  rows: Row[];
  onChange: (rows: Row[]) => void;
  /** Names the board for screen readers and the typing row ("State, Guess 3"). */
  label?: string;
  renderRowEnd?: (row: Row, index: number) => ReactNode;
}) {
  const uid = useId();
  const root = useRef<HTMLDivElement>(null);
  const [typed, setTyped] = useState("");
  const [refused, setRefused] = useState<{ word: string; message: string } | null>(null);
  const latest = useRef("");
  const rowsNow = useRef(rows);
  useEffect(() => {
    rowsNow.current = rows;
  });

  const open = canType(rows);
  const win = isWin(rows);
  const live = useGuessCheck(typed, open);
  const error = refused?.word === typed ? refused.message : live.error;

  const apply = (next: { rows: Row[]; typed: string }) => {
    latest.current = next.typed;
    setTyped(next.typed);
    if (next.rows !== rows) onChange(next.rows);
  };
  const board = { rows, typed };

  const enter = async (word: string) => {
    const message = await checkGuess(word);
    if (latest.current !== word) return; // edited while the API was answering
    if (message) setRefused({ word, message });
    else apply(enterGuess({ rows: rowsNow.current, typed: word }));
  };

  // Letters typed while a tile has focus go to the typing row, as in the gpui app.
  const forwardKeys = (e: React.KeyboardEvent) => {
    if (!(e.target instanceof HTMLButtonElement) || e.altKey || e.ctrlKey || e.metaKey || !open) return;
    const field = root.current?.querySelector<HTMLInputElement>("input");
    if (/^[a-zA-Z]$/.test(e.key)) field?.focus();
    else if (e.key === "Backspace") {
      e.preventDefault();
      field?.focus();
      apply(backspace(board));
    }
  };

  return (
    <div ref={root} onKeyDownCapture={forwardKeys} role="group" aria-label={label}>
      <ol className="space-y-3">
        {rows.map((row, i) => (
          <li key={i} className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex gap-1.5" role="group" aria-label={`Guess ${i + 1}: ${row.guess.toUpperCase()}`}>
              {Array.from({ length: WORD_LENGTH }, (_, p) => (
                <Tile key={p} letter={row.guess[p]} mark={row.marks[p]} onCycle={() => apply(cycleMark(board, i, p))} />
              ))}
            </div>
            {renderRowEnd?.(row, i)}
          </li>
        ))}
        {open && (
          <li>
            <WordRow
              id={`${uid}-typing`}
              label={`${label}: type Guess ${rows.length + 1}`}
              hideLabel
              value={typed}
              onChange={(word) => {
                // Same effect as typing each new letter on the board; paste fills several at once.
                apply({ rows, typed: [...word].reduce((b, ch) => typeLetter(b, ch), { rows, typed: "" }).typed });
              }}
              onEnter={enter}
              onBackspaceEmpty={() => apply(backspace(board))}
              keepFocus
              error={error}
              hint={rows.length === 0 ? "Type a Guess and press Enter, then click its tiles to set the Marks." : undefined}
            />
          </li>
        )}
      </ol>
      {win && (
        <p className="mt-3 text-sm text-text" role="status">
          Every tile is Correct: that Guess is a Win, so there is nothing more to enter.
        </p>
      )}
      {!open && !win && (
        <p className="mt-3 text-sm text-meta" role="status">
          Six Guesses is the limit.
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={rows.length === 0 && typed === ""}
          onClick={() => {
            apply(startOver());
            root.current?.querySelector<HTMLInputElement>("input")?.focus();
          }}
        >
          Start over
        </Button>
        {rows.length > 0 && (
          <span className="text-xs text-meta">Click a tile to change its Mark. Backspace takes the last Guess back.</span>
        )}
      </div>
    </div>
  );
}
