import type { Language } from "@/lib/i18n/language";
import type { PageText } from "@/lib/i18n/page-text";
import { followPath, openerSplitPath, openersPath } from "@/lib/i18n/paths";

/** The keys of the page text table that hold plain strings. */
type TextKey = { [K in keyof PageText]: PageText[K] extends string ? K : never }[keyof PageText];

/** An Explore page, as the sidebar and the home page list it. The text keys name entries in the page text table. */
export type ExplorePage = {
  id: string;
  path: (lang: Language) => string;
  name: TextKey;
  purpose: TextKey;
  points: TextKey[];
  /** Slugs of the Articles the page builds on. */
  articles: string[];
};

/** The Explore pages in the sidebar's order. A new Explore page is added here, plus its text keys. */
export const EXPLORE_PAGES: ExplorePage[] = [
  {
    id: "openers",
    path: (lang) => openersPath(lang),
    name: "openerDistribution",
    purpose: "exploreOpenersPurpose",
    points: ["exploreOpenersPoint1", "exploreOpenersPoint2", "exploreOpenersPoint3"],
    articles: ["opener-distribution"],
  },
  {
    id: "opener-split",
    path: (lang) => openerSplitPath(lang),
    name: "openerSplit",
    purpose: "exploreOpenerSplitPurpose",
    points: ["exploreOpenerSplitPoint1", "exploreOpenerSplitPoint2", "exploreOpenerSplitPoint3"],
    articles: ["feedback-split", "openers"],
  },
  {
    id: "follow",
    path: (lang) => followPath(lang),
    name: "follow",
    purpose: "exploreFollowPurpose",
    points: ["exploreFollowPoint1", "exploreFollowPoint2", "exploreFollowPoint3"],
    articles: ["greedy-strategy"],
  },
];
