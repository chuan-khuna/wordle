// Gives each `##` and `###` heading of an Article an id from its text ("Two word lists" -> "two-word-lists"), so
// the Table of contents can link to it. lib/content/headings.ts lists the same headings from the MDX source with
// the same slugger, so the links and the ids agree. Named by string in next.config.ts.

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

const textOf = (node) => (node.type === "text" ? node.value : (node.children ?? []).map(textOf).join(""));

export default function rehypeHeadingIds() {
  return (tree) => {
    const slug = createSlugger();
    const visit = (node) => {
      if (node.type === "element" && DEPTHS.has(node.tagName)) {
        node.properties = { ...node.properties, id: slug(textOf(node)) };
        return;
      }
      for (const child of node.children ?? []) visit(child);
    };
    visit(tree);
  };
}
