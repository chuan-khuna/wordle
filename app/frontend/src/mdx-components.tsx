import type { MDXComponents } from "mdx/types";
import type { ComponentProps } from "react";
import { CodeFigure } from "@/components/CodeFigure";
import { Mark } from "@/components/Mark";
import { Term } from "@/components/Term";
import { Word } from "@/components/Word";
import { BenchmarkChart } from "@/components/widgets/BenchmarkChart";
import { CandidateFilter } from "@/components/widgets/CandidateFilter";
import { FeedbackScorer } from "@/components/widgets/FeedbackScorer";
import { OpenerTable } from "@/components/widgets/OpenerTable";
import { SplitExplorer } from "@/components/widgets/SplitExplorer";
import { StepThroughGame } from "@/components/widgets/StepThroughGame";

// <Term>, <Mark>, <Word> and the Widgets are available in every Article and Series without an import.
// A highlighted code block is a <figure data-rehype-pretty-code-figure>; it gets the copy button.
function Figure(props: ComponentProps<"figure">) {
  return "data-rehype-pretty-code-figure" in props ? <CodeFigure {...props} /> : <figure {...props} />;
}

const components: MDXComponents = { figure: Figure, Term, Mark, Word, FeedbackScorer, CandidateFilter, SplitExplorer, StepThroughGame, OpenerTable, BenchmarkChart };

export function useMDXComponents(): MDXComponents {
  return components;
}
