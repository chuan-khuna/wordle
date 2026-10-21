import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Literata, Source_Code_Pro, Source_Sans_3, Source_Serif_4 } from "next/font/google";
import { Board, Boards } from "@/components/prose/Boards";
import { Letter } from "@/components/prose/Letter";
import { MarginNote } from "@/components/prose/MarginNote";
import { Mark } from "@/components/prose/Mark";
import { Term } from "@/components/prose/Term";
import { Word } from "@/components/prose/Word";
import { BenchmarkChart } from "@/components/widgets/BenchmarkChart";
import { type Pairing, TypeLabSwitch } from "./TypeLabSwitch";

// A throwaway page to compare font pairings on real content. Not linked from the site; delete once a pairing is chosen.
export const metadata: Metadata = { title: "Type lab", robots: { index: false } };

const sourceSerif = Source_Serif_4({ subsets: ["latin"], style: ["normal", "italic"], axes: ["opsz"], variable: "--font-lab-source-serif" });
const sourceSans = Source_Sans_3({ subsets: ["latin"], variable: "--font-lab-source-sans" });
const sourceCode = Source_Code_Pro({ subsets: ["latin"], variable: "--font-lab-source-code" });
const literata = Literata({ subsets: ["latin"], style: ["normal", "italic"], axes: ["opsz"], variable: "--font-lab-literata" });
const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-lab-plex-sans" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-lab-plex-mono" });

const PAIRINGS: Pairing[] = [
  { id: "current", label: "Newsreader · Inter · JetBrains Mono", note: "The site as it is now.", serif: "", sans: "", mono: "" },
  {
    id: "source",
    label: "Source Serif 4 · Source Sans 3 · Source Code Pro",
    note: "One superfamily drawn to work together; the serif has optical sizes.",
    serif: "var(--font-lab-source-serif)",
    sans: "var(--font-lab-source-sans)",
    mono: "var(--font-lab-source-code)",
  },
  {
    id: "literata",
    label: "Literata · IBM Plex Sans · IBM Plex Mono",
    note: "A serif made for long reading on screens (optical sizes), with Plex's more technical sans and mono.",
    serif: "var(--font-lab-literata)",
    sans: "var(--font-lab-plex-sans)",
    mono: "var(--font-lab-plex-mono)",
  },
];

const FONT_CLASSES = [sourceSerif, sourceSans, sourceCode, literata, plexSans, plexMono].map((f) => f.variable).join(" ");

export default function TypeLab() {
  return (
    <TypeLabSwitch pairings={PAIRINGS} fontClasses={FONT_CLASSES}>
      <article className="article relative min-w-0 space-y-12">
        <header className="max-w-measure space-y-4">
          <p className="eyebrow">Part 1 · Wordle · 02</p>
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-balance text-text">Feedback</h1>
          <p className="text-lg text-meta">Every Guess is judged letter by letter, and repeated letters follow a two-pass rule.</p>
        </header>
        <div className="prose prose-theme article-body [&>:is(p,ul,ol,h2,h3,h4,blockquote)]:max-w-measure">
          <p>
            After every Guess, the game gives you <Term>Feedback</Term>: five <Term of="Mark">Marks</Term>, one for each letter.
          </p>
          <p>
            A letter can be <Mark kind="correct" />, which means it is in the Answer at this position. It can be <Mark kind="present" />, which
            means it is in the Answer, but somewhere else. Or it can be <Mark kind="absent" />, which means the Answer has no use for it.
          </p>
          <p>
            Three verdicts for five letters gives 243 possible Feedbacks. Remember that number.
            <MarginNote>
              Strictly, only 238 of them can happen. For example, <Word feedback="22221">crank</Word> can never be shown: with C, R, A and N
              Correct the Answer is <Word>cran_</Word>, so a K would have to sit in the last spot, where it would be Correct.
            </MarginNote>
          </p>
          <h2>The repeated-letter rule</h2>
          <p>
            Most letters are easy. The trouble starts when a Guess repeats a letter. Try this one. The Guess is{" "}
            <Word answer="abide">speed</Word> and the Answer is <Word>abide</Word>. The first <Letter mark="present">e</Letter> is Present,
            the second is Absent: the Answer has only one E, and Correct Marks are given out first.
          </p>
          <p>
            <em>A Guess that cannot win can still be the best Guess.</em> From the five words of the <Word>_atch</Word> family, the Solver
            plays <Word>ablow</Word>: it is worth 1.92 bits and leaves 1.4 words on average.
          </p>
          <pre>
            <code>{"def feedback(guess: str, answer: str) -> str:\n    marks = [0] * 5  # 0 Absent, 1 Present, 2 Correct\n    ..."}</code>
          </pre>
        </div>
        <Boards title="Two Searches">
          <Board label="Candidates only" pattern="_atch" guesses="raise tangy caput batch hatch latch match watch" />
          <Board label="All words" pattern="_atch" guesses="raise tangy caput ablow watch" highlight="ablow" />
        </Boards>
        <BenchmarkChart id="lab" strategies="bits-answers-candidates,bits-guesses-candidates,bits-guesses-all" />
      </article>
    </TypeLabSwitch>
  );
}
