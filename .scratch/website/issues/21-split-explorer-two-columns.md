# Split explorer: chart beside the remaining words, one per Article

Status: ready-for-agent
Blocked by: 20

Lay the Split explorer out in two columns:

- **Left column, the chart.** Its title is the Expected Candidates and this Guess's Expected Information together, for example "Expected 79 words left · 6.19 bits", with the "142 Feedbacks over 2315 Candidates" line under it. The bits are always shown: remove the `bits` prop and its docs.
- **Right column, the remaining words.** The selected Feedback's tiles (the Guess's five Marks) and the number of words left, then the words themselves in a compact mono grid that scrolls inside the column if long, with "Show all" if they are capped. Before anything is selected it shows the largest group's words, or a short hint to pick a bar. The probability caption ("4.4% chance of this Feedback, leaving 102 words") sits with the selection.
- The two columns sit side by side when the Widget is wide enough (use a container query on the Widget, not the viewport, since the Article column is narrower than the window). The chart column takes the larger share, and both columns are the same height, the chart's scroll box. Below that width they stack: chart, then words. No sideways page scroll at 390px.
- Article 06 uses one Split explorer, not two: keep one Widget that shows both the Feedback Split and its bits, and adjust the prose around it.
- Keep the URL params (`guess`, `state`) and the selection behaviour. Update `docs/documents/web-frontend.md` and the spec's Widget line.

See [spec](../spec.md).
