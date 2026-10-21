/** The Opener Distribution page (`/openers`): highlighted words, the block tooltip, a bar's list, a tab, the filter, a badge's card. */
import { around, boxOf, click, hover, type Shot, withCard } from "./lib";

const CHART = "[role=region][aria-label^='Opener Distribution chart']";
/** The stat cards of the highlighted words. */
const CARDS = "div[aria-live] ul";

export default [
  { name: "highlighted-words", path: "/openers?highlight=salet,crane,fuzzy", crop: around([CARDS, CHART]) },
  { name: "block-tooltip", path: "/openers?highlight=salet", act: (p) => hover(p, "rect[data-word=salet]"), crop: (p) => boxOf(p, CHART) },
  {
    name: "bar-list",
    path: "/openers?highlight=salet",
    act: (p) => click(p, "rect[data-word=salet]"),
    crop: around([CHART, "aside[aria-label='Openers in the selected bar']"]),
  },
  { name: "myths-tab", path: "/openers", act: (p) => p.getByRole("tab", { name: "Myths" }).click(), crop: (p) => boxOf(p, CARDS) },
  { name: "answers-only", path: "/openers?answersOnly=true", crop: (p) => boxOf(p, CHART) },
  {
    name: "word-list-badge-card",
    path: "/openers?highlight=crane",
    act: (p) => hover(p, `${CARDS} [role=button]`),
    crop: withCard(`${CARDS} li`),
  },
] satisfies Shot[];
