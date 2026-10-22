// The Widgets an Article can embed, by MDX tag name, with the title each one shows (WidgetFrame's eyebrow). The
// Table of contents lists them under the same titles. A plain .mjs so the rehype plugin that anchors them can import it.

export const WIDGET_TITLES = {
  FeedbackScorer: "Feedback scorer",
  CandidateFilter: "Candidate filter",
  SplitExplorer: "Feedback Split explorer",
  StepThroughGame: "Step-through Game",
  SideBySideGame: "Side-by-side Game",
  OpenerTable: "Opener table",
  BenchmarkChart: "Benchmark chart",
  OpenerDistribution: "Opener Distribution",
};

/** The id of the anchor right before a Widget written with `id="fb"`: `widget-fb`. */
export const widgetAnchor = (id) => `widget-${id}`;
