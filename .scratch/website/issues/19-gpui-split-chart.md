# Split explorer: the gpui app's Feedback Split chart

Status: done
Blocked by: 18

Replace the Split explorer's vertical TanStack bar chart with the chart from the gpui app's Solver panel (see the Chart bullet under the Solver section of `docs/documents/gpui-app.md`, and `app/wordle-gpui/src/ui/solver_panel.rs`):

- One horizontal bar per Feedback, every group drawn, biggest first (ties in the same order as the gpui app).
- Each bar's label is the Feedback's five Marks as small tiles in the theme's `correct`, `present` and `absent` colours (reuse `Tile`), with the group's figures beside the bar: the words that would remain (its size) and the probability that the Guess (an Opener, on an empty State) gives this Feedback, which is the group's size over the Candidate Set's size (for example "15 words · 30.6%"). Hovering or selecting a bar names the probability in full ("30.6% chance of this Feedback, leaving 15 words"). Figures use the mono font with tabular figures and line up in a column. The bar's length is the number of Candidates that would give that Feedback; the Win bar uses the `correct` colour.
- The title gives the Expected Candidates (expected words left) and, unless the Widget's `bits={false}`, the Expected Information in bits, as in the gpui app.
- The chart scrolls inside a box once it is taller than about 320px; the page never scrolls sideways at 390px.
- Clicking a bar, or pressing Enter or Space on it, selects that group and shows its words, as the current Widget does. Bars are buttons with `aria-pressed` and an accessible name such as "Feedback 00102, 15 words". The separate list of groups under the chart goes away, since the chart now shows every group.
- Draw it with plain elements and the design tokens, like the gpui app, not TanStack Charts: TanStack's axis labels cannot be coloured tiles. The Benchmark chart stays on TanStack. Remove `GroupChart.tsx` if nothing else uses it.
- Keep the Widget's props, URL params and the Article that uses it (06, twice). Update the spec's Charts line and `docs/documents/web-frontend.md`.

See [spec](../spec.md).

## Comments

New `SplitChart.tsx` (plain elements and tokens) replaces `GroupChart.tsx` and the separate group list. Rows are `aria-pressed` buttons with `Tile tiny` labels; figures "15 words · 30.6%" (just "15  30.6%" below `sm`). The full probability sentence is a caption driven by hover, focus or selection, not a per-bar Tooltip (150 Radix tooltips, and none on touch). Pure helpers and tests in `lib/split-chart.ts`. Docs: `web-frontend.md`, spec Charts line.
