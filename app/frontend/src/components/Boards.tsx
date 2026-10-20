import type { ReactNode } from "react";
import { scoreFeedback, WORD_LENGTH } from "@/lib/feedback";
import { guessList } from "@/lib/words";
import { Tile } from "./widgets/Tile";
import { WidgetFrame } from "./widgets/ui";
import { Word } from "./Word";

// Six Guesses, as in the game (wordle.engine.game.MAX_GUESSES). A board marks where they run out.
const GUESS_LIMIT = 6;

/**
 * Static Game boards side by side, as many columns as fit: `<Boards title="…">` holding `<Board>`s.
 * Drawn at build time, no client code.
 */
export function Boards({ title, children }: { title: string; children: ReactNode }) {
  return (
    <WidgetFrame title={title}>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-x-4 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]">
        {children}
      </div>
    </WidgetFrame>
  );
}

/**
 * One Game as a board: `<Board pattern="_atch" guesses="raise tangy caput batch hatch latch match watch" />`.
 * The last Guess is the Answer, and every row is painted with its Feedback against it. A rule after the sixth row
 * marks the Guess Limit. `pattern` (optional) names the family above the board, as <Word> draws it. A Guess not on
 * the Guess List throws, which fails the build.
 */
export function Board({ guesses, pattern }: { guesses: string; pattern?: string }) {
  const words = guesses.trim().toLowerCase().split(/\s+/);
  const list = guessList();
  for (const word of words) {
    if (word.length !== WORD_LENGTH || !list.has(word)) throw new Error(`<Board>: "${word}" is not on the Guess List.`);
  }
  const answer = words[words.length - 1];

  return (
    <figure className="m-0">
      <figcaption className="mb-2 flex flex-wrap items-baseline gap-x-2 text-meta">
        {pattern && <Word>{pattern}</Word>}
        <span>
          <span className="font-mono text-text uppercase">{answer}</span> in {words.length}
        </span>
      </figcaption>
      <ol className="space-y-1" aria-label={`Guesses for ${answer}`}>
        {words.map((guess, i) => (
          <li
            key={i}
            className={`flex items-center gap-2 ${i === GUESS_LIMIT ? "mt-2 border-t border-dashed border-rule pt-2" : ""}`}
          >
            <span className="w-3 text-right font-mono text-xs text-meta">{i + 1}</span>
            <span className="flex gap-1" role="group" aria-label={`Guess ${i + 1}: ${guess}`}>
              {scoreFeedback(guess, answer).map((mark, j) => (
                <Tile key={j} letter={guess[j]} mark={mark} board />
              ))}
            </span>
          </li>
        ))}
      </ol>
    </figure>
  );
}
