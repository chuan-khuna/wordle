import { MARK_NAMES, parseMarks, scoreFeedback, WORD_LENGTH, type Mark } from "@/lib/wordle/feedback";
import { fitsPattern, guessList } from "@/lib/wordle/words";
import { INLINE, PAINT, PLAIN, TILE } from "./letter-tile";

const VARIANTS = ["cell", "simple", "text"] as const;
type Variant = (typeof VARIANTS)[number];

// Caps in the surrounding font, a little smaller and spaced, so a run of capitals is no louder than the words around
// it. Tiles and frames are kept for words that carry Feedback.
const SIMPLE = "text-[0.82em] uppercase tracking-[0.06em]";

// Mono caps, for a word shown as data.
const TEXT = "font-mono text-[0.8em] uppercase tracking-caps";

/**
 * A word in prose. `<Word>speed</Word>` shows the word in small caps of the surrounding font, unframed (variant "simple");
 * `<Word feedback="00101">speed</Word>` draws five letter tiles painted with each letter's Mark (digits 0 Absent,
 * 1 Present, 2 Correct), and `<Word answer="abide">speed</Word>` works the Feedback out against that Answer.
 * `variant` overrides the look: "cell" (five tiles, plain without Feedback), "simple", or "text" (mono caps, no frame).
 * `_` is a blank for a family of words: `<Word>_atch</Word>` shows _ATCH (an empty tile in "cell"), and must fit
 * some word on the Guess List. Tiles mean Feedback can be shown, so "simple" or "text" with Feedback throws, and so
 * does Feedback on a word with blanks. A word not on the Guess List, a pattern no word fits, malformed Feedback,
 * both `feedback` and `answer`, or an unknown variant throws, which fails the build.
 */
export function Word({
  children,
  feedback,
  answer,
  variant,
}: {
  children: string;
  feedback?: string;
  answer?: string;
  variant?: Variant;
}) {
  const word = String(children).trim().toLowerCase();
  const words = guessList();
  const blanks = word.includes("_");
  if (word.length !== WORD_LENGTH || !/^[a-z_]+$/.test(word) || !(blanks ? fitsPattern(word, words) : words.has(word))) {
    throw new Error(`<Word>: "${children}" is not on the Guess List${blanks ? " and fits no word on it" : ""}.`);
  }
  if (feedback !== undefined && answer !== undefined) {
    throw new Error(`<Word>${word}</Word>: give either feedback or answer, not both.`);
  }
  if (blanks && (feedback !== undefined || answer !== undefined)) {
    throw new Error(`<Word>${word}</Word>: a word with blanks takes no feedback or answer.`);
  }
  if (answer !== undefined && !words.has(answer.toLowerCase())) {
    throw new Error(`<Word>${word}</Word>: answer "${answer}" is not on the Guess List.`);
  }
  if (variant !== undefined && !VARIANTS.includes(variant)) {
    throw new Error(`<Word>${word}</Word>: variant "${variant}" must be one of ${VARIANTS.join(", ")}.`);
  }

  let marks: Mark[] | null = null;
  if (feedback !== undefined) {
    marks = parseMarks(feedback);
    if (!marks) throw new Error(`<Word>${word}</Word>: feedback "${feedback}" must be five digits 0, 1 or 2.`);
  } else if (answer !== undefined) {
    marks = scoreFeedback(word, answer.toLowerCase());
  }

  const look = variant ?? (marks ? "cell" : "simple");
  if (marks && look !== "cell") {
    throw new Error(`<Word>${word}</Word>: Feedback needs the "cell" variant, not "${look}".`);
  }

  // Screen readers get the word, then each letter's Mark when there is Feedback. A word with blanks is spelled out,
  // since "_ATCH" does not read as anything.
  const spelled = [...word].map((letter) => (letter === "_" ? "blank" : letter.toUpperCase())).join(", ");
  const label = marks
    ? `${word.toUpperCase()}: ${[...word].map((letter, i) => `${letter.toUpperCase()} ${MARK_NAMES[marks![i]]}`).join(", ")}`
    : blanks
      ? spelled
      : word.toUpperCase();

  if (look !== "cell") {
    const className = `${look === "simple" ? SIMPLE : TEXT} ${INLINE}`;
    // A whole word reads as itself; only a word with blanks needs the label.
    return blanks ? (
      <span role="img" aria-label={label} className={className}>
        {word}
      </span>
    ) : (
      <span className={className}>{word}</span>
    );
  }

  return (
    <span role="img" aria-label={label} className={`inline-flex gap-[0.12em] ${INLINE}`}>
      {[...word].map((letter, i) => (
        <span key={i} aria-hidden className={`${TILE} ${marks ? PAINT[marks[i]] : PLAIN}`}>
          {letter === "_" ? "" : letter}
        </span>
      ))}
    </span>
  );
}
