# Widgets: Feedback Split explorer and Step-through Game

Status: done
Blocked by: 07

Build Widgets 3 and 4. The Split explorer is a bar chart of groups that shows Expected Information and Expected Candidates. Draw charts with TanStack Charts (`@tanstack/react-charts`, added with `bun add`), coloured from the theme roles. The Step-through Game uses `/api/solve` and has prev/next controls.

See [spec](../spec.md).

## Comments

- Added `SplitExplorer` (with `GroupChart`, TanStack Charts) and `StepThroughGame`, registered in `mdx-components.tsx`; props and URL params are in `docs/documents/web-frontend.md`.
- The chart draws the 30 largest groups; a scrollable list holds all of them. `bits={false}` hides Expected Information.
- Sample Articles `sample-feedback-split`, `sample-expected-information` and `sample-greedy-strategy` (orders 3 to 5) use the Widgets.
