// Anchors for the Table of contents. Each `##` and `###` heading of an Article gets an id from its text ("Two word
// lists" -> "two-word-lists"), and each Widget written with an `id` gets an empty anchor right before it
// (`<span id="widget-fb" class="widget-anchor">`), so the Table of contents can link to both. lib/content/toc.ts
// lists the same entries from the MDX source with the same rules, so the links and the ids agree. Named by string
// in next.config.ts.

import { WIDGET_TITLES, widgetAnchor } from "../widgets/widget-titles.mjs";

const DEPTHS = new Set(["h2", "h3"]);

/** A slug for heading text: lower case, letters (any script, with their marks), digits and hyphens, spaces as hyphens. */
export function headingSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** A slugger for one page: a repeated heading gets `-1`, `-2` and so on, so every id is unique. */
export function createSlugger() {
  const seen = new Map();
  return (text) => {
    const base = headingSlug(text) || "section";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
}

/** The `id` written on a Widget's tag (`<FeedbackScorer id="fb" />`), or null for another tag or a Widget with none. */
export function widgetId(node) {
  if (node.type !== "mdxJsxFlowElement" || !Object.hasOwn(WIDGET_TITLES, node.name)) return null;
  const id = node.attributes?.find((a) => a.type === "mdxJsxAttribute" && a.name === "id")?.value;
  return typeof id === "string" && id !== "" ? id : null;
}

const textOf = (node) => (node.type === "text" ? node.value : (node.children ?? []).map(textOf).join(""));

export default function rehypeTocAnchors() {
  return (tree) => {
    const slug = createSlugger();
    const visit = (node) => {
      if (node.type === "element" && DEPTHS.has(node.tagName)) {
        node.properties = { ...node.properties, id: slug(textOf(node)) };
        return;
      }
      if (!node.children) return;
      const out = [];
      for (const child of node.children) {
        const id = widgetId(child);
        if (id) out.push({ type: "element", tagName: "span", properties: { id: widgetAnchor(id), className: ["widget-anchor"] }, children: [] });
        else visit(child);
        out.push(child);
      }
      node.children = out;
    };
    visit(tree);
  };
}
