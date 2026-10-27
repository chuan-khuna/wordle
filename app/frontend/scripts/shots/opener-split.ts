/** The Opener Split page (`/opener-split`): the stat card and blocks, the two cards, Bars, Compare (SLATE and FUZZY, the whole page) and Full screen. */
import { around, hover, type Shot, wholePage, withCard } from "./lib";

const CARD = "div:has(> dl[aria-label^='Figures for'])";
const SPLIT = "ul[aria-label^='Feedback Split of']";
/** One Opener's stat card and split. */
const RESULT = "main section:has(dl)";

export default [
  { name: "stat-card-and-blocks", path: "/opener-split?opener=salet", crop: around([CARD, SPLIT], 900) },
  { name: "head-stats-card", path: "/opener-split?opener=salet", act: (p) => hover(p, `${SPLIT} [data-head]`), crop: withCard(`${SPLIT} > li`) },
  {
    name: "follow-this-answer",
    path: "/opener-split?opener=salet",
    act: async (p) => {
      await p.locator(`${SPLIT} button[data-word]`).first().click();
      await p.waitForTimeout(400);
    },
    crop: withCard(`${SPLIT} > li`),
  },
  { name: "bars", path: "/opener-split?opener=salet&view=bars", crop: around([RESULT], 900) },
  { name: "compare", path: "/opener-split?compare=fuzzy&opener=slate", crop: wholePage },
  { name: "full-screen", path: "/opener-split?opener=salet&fit=1", crop: async () => null },
] satisfies Shot[];
