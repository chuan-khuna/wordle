import type { MDXComponents } from "mdx/types";
import type { ComponentProps } from "react";
import { Board, Boards } from "@/components/prose/Boards";
import { CodeFigure } from "@/components/prose/CodeFigure";
import { Letter } from "@/components/prose/Letter";
import { MarginNote } from "@/components/prose/MarginNote";
import { Mark } from "@/components/prose/Mark";
import { Term } from "@/components/prose/Term";
import { Word } from "@/components/prose/Word";
import { DEFAULT_LANGUAGE, type Language } from "@/lib/i18n/language";
import { BenchmarkChart } from "@/components/widgets/BenchmarkChart";
import { CandidateFilter } from "@/components/widgets/CandidateFilter";
import { FeedbackScorer } from "@/components/widgets/FeedbackScorer";
import { OpenerDistribution } from "@/components/widgets/OpenerDistribution";
import { OpenerTable } from "@/components/widgets/OpenerTable";
import { SplitExplorer } from "@/components/widgets/SplitExplorer";
import { SideBySideGame } from "@/components/widgets/SideBySideGame";
import { StepThroughGame } from "@/components/widgets/StepThroughGame";

// <Term>, <Mark>, <Word>, <Letter>, <MarginNote>, <Boards>/<Board> and the Widgets are available in every Article and Series without an import.
// A highlighted code block is a <figure data-rehype-pretty-code-figure>; it gets the copy button.
function Figure(props: ComponentProps<"figure">) {
  return "data-rehype-pretty-code-figure" in props ? <CodeFigure {...props} /> : <figure {...props} />;
}

const components: MDXComponents = { figure: Figure, Term, Mark, Word, Letter, MarginNote, Boards, Board, FeedbackScorer, CandidateFilter, SplitExplorer, StepThroughGame, SideBySideGame, OpenerTable, BenchmarkChart, OpenerDistribution };

/** The components for a language: <Term> and <Mark> look their definitions up in that language's glossary. A page passes them to the MDX body as `components`. */
export function componentsFor(lang: Language = DEFAULT_LANGUAGE): MDXComponents {
  return {
    ...components,
    Term: (props: ComponentProps<typeof Term>) => <Term {...props} lang={lang} />,
    Mark: (props: ComponentProps<typeof Mark>) => <Mark {...props} lang={lang} />,
  };
}

export function useMDXComponents(): MDXComponents {
  return components;
}
