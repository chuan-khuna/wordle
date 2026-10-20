import type { MDXComponents } from "mdx/types";
import { Term } from "@/components/Term";
import { CandidateFilter } from "@/components/widgets/CandidateFilter";
import { FeedbackScorer } from "@/components/widgets/FeedbackScorer";
import { SplitExplorer } from "@/components/widgets/SplitExplorer";
import { StepThroughGame } from "@/components/widgets/StepThroughGame";

// <Term> and the Widgets are available in every Article and Series without an import.
const components: MDXComponents = { Term, FeedbackScorer, CandidateFilter, SplitExplorer, StepThroughGame };

export function useMDXComponents(): MDXComponents {
  return components;
}
