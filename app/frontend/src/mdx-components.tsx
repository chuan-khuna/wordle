import type { MDXComponents } from "mdx/types";
import { Mark } from "@/components/Mark";
import { Term } from "@/components/Term";
import { BenchmarkChart } from "@/components/widgets/BenchmarkChart";
import { CandidateFilter } from "@/components/widgets/CandidateFilter";
import { FeedbackScorer } from "@/components/widgets/FeedbackScorer";
import { OpenerTable } from "@/components/widgets/OpenerTable";
import { SplitExplorer } from "@/components/widgets/SplitExplorer";
import { StepThroughGame } from "@/components/widgets/StepThroughGame";

// <Term>, <Mark> and the Widgets are available in every Article and Series without an import.
const components: MDXComponents = { Term, Mark, FeedbackScorer, CandidateFilter, SplitExplorer, StepThroughGame, OpenerTable, BenchmarkChart };

export function useMDXComponents(): MDXComponents {
  return components;
}
