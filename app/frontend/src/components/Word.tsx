import { MARK_NAMES, parseMarks, scoreFeedback, WORD_LENGTH, type Mark } from "@/lib/feedback";
import { guessList } from "@/lib/words";

// Full class names, so Tailwind sees them, by Mark (0 Absent, 1 Present, 2 Correct). `text-ink-*` is the
// readable text colour for small type (tokens.css), as <Mark> uses.
const PAINT = ["bg-absent text-ink-absent", "bg-present text-ink-present", "bg-correct text-ink-correct"] as const;
const PLAIN = "border border-rule-strong text-text";

// One small letter tile: mono caps on the tile radius, sized to the prose so it does not grow the line.
const TILE = "inline-flex h-[1.45em] w-[1.3em] items-center justify-center rounded-sm font-mono text-[0.72em] leading-none font-semibold uppercase";

/**
 * A word in prose, drawn as five small letter tiles. `<Word>speed</Word>` shows plain tiles;
 * `<Word feedback="00101">speed</Word>` paints each letter with its Mark (digits 0 Absent, 1 Present, 2 Correct),
 * and `<Word answer="abide">speed</Word>` works the Feedback out against that Answer. A word not on the Guess List,
 * malformed Feedback, or both `feedback` and `answer` throws, which fails the build.
 */
export function Word({ children, feedback, answer }: { children: string; feedback?: string; answer?: string }) {
  const word = String(children).trim().toLowerCase();
  const words = guessList();
  if (word.length !== WORD_LENGTH || !words.has(word)) {
    throw new Error(`<Word>: "${children}" is not on the Guess List.`);
  }
  if (feedback !== undefined && answer !== undefined) {
    throw new Error(`<Word>${word}</Word>: give either feedback or answer, not both.`);
  }
  if (answer !== undefined && !words.has(answer.toLowerCase())) {
    throw new Error(`<Word>${word}</Word>: answer "${answer}" is not on the Guess List.`);
  }

  let marks: Mark[] | null = null;
  if (feedback !== undefined) {
    marks = parseMarks(feedback);
    if (!marks) throw new Error(`<Word>${word}</Word>: feedback "${feedback}" must be five digits 0, 1 or 2.`);
  } else if (answer !== undefined) {
    marks = scoreFeedback(word, answer.toLowerCase());
  }

  // Screen readers get the word, then each letter's Mark when there is Feedback.
  const label = marks
    ? `${word.toUpperCase()}: ${[...word].map((letter, i) => `${letter.toUpperCase()} ${MARK_NAMES[marks![i]]}`).join(", ")}`
    : word.toUpperCase();

  return (
    <span role="img" aria-label={label} className="inline-flex gap-[0.12em] align-middle whitespace-nowrap">
      {[...word].map((letter, i) => (
        <span key={i} aria-hidden className={`${TILE} ${marks ? PAINT[marks[i]] : PLAIN}`}>
          {letter}
        </span>
      ))}
    </span>
  );
}
