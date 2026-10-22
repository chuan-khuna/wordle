import { readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { Language } from "@/lib/i18n/language";
import { WIDGET_TITLES, widgetAnchor } from "@/lib/widgets/widget-titles.mjs";
import { createSlugger } from "./rehype-toc-anchors.mjs";

/** The tag name of a Widget an Article can embed (`FeedbackScorer`). */
export type WidgetName = keyof typeof WIDGET_TITLES;

/**
 * One entry of an Article's Table of contents, with the id `rehype-toc-anchors` gives it: a `##` (depth 2) or
 * `###` (depth 3) heading, or a Widget written with an `id` (listed under its title).
 */
export type TocEntry =
  | { kind: "heading"; depth: 2 | 3; text: string; id: string }
  | { kind: "widget"; widget: WidgetName; text: string; id: string };

/** Inline Markdown in a heading, as plain text: code, emphasis and link syntax dropped, the words kept. */
function plain(text: string) {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*_]/g, "")
    .trim();
}

const isWidget = (name: string): name is WidgetName => Object.hasOwn(WIDGET_TITLES, name);

/**
 * The Table of contents of an MDX body, in order: its `##` and `###` headings and its Widgets that have an `id`
 * (a tag that starts a line; its props may run over several lines), skipping fenced code blocks. Pure.
 */
export function tocOf(body: string): TocEntry[] {
  const slug = createSlugger();
  const out: TocEntry[] = [];
  const lines = body.split("\n");
  let fence: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const open = line.match(/^\s*(`{3,}|~{3,})/);
    if (open) {
      if (fence === null) fence = open[1];
      else if (line.trim().startsWith(fence)) fence = null;
      continue;
    }
    if (fence !== null) continue;
    const heading = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const text = plain(heading[2]);
      out.push({ kind: "heading", depth: heading[1].length as 2 | 3, text, id: slug(text) });
      continue;
    }
    const tag = line.match(/^<([A-Z]\w*)\b/);
    if (tag && isWidget(tag[1])) {
      let props = line;
      while (!props.includes(">") && i + 1 < lines.length) props += `\n${lines[++i]}`;
      const id = props.match(/\bid="([^"]+)"/)?.[1];
      if (id) out.push({ kind: "widget", widget: tag[1], text: WIDGET_TITLES[tag[1]], id: widgetAnchor(id) });
    }
  }
  return out;
}

/** The Table of contents of one Article's file in a language (the Translation for Thai). */
export function articleToc(fileName: string, lang: Language): TocEntry[] {
  const dir = lang === "en" ? "articles" : path.join(lang, "articles");
  const file = path.resolve(process.cwd(), "content", dir, `${fileName}.mdx`);
  return tocOf(matter(readFileSync(file, "utf8")).content);
}
