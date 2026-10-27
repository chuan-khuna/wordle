import { describe, expect, test } from "bun:test";
import { compile } from "@mdx-js/mdx";
import { tocOf } from "./toc";
import rehypeTocAnchors, { headingSlug } from "./rehype-toc-anchors.mjs";

async function js(src: string) {
  return String(await compile(src, { rehypePlugins: [rehypeTocAnchors] }));
}

describe("headingSlug", () => {
  test("lower case, punctuation dropped, spaces as hyphens", () => {
    expect(headingSlug("Two word lists")).toBe("two-word-lists");
    expect(headingSlug("salet or slate?")).toBe("salet-or-slate");
    expect(headingSlug("A Guess that can't win")).toBe("a-guess-that-cant-win");
  });

  test("Thai keeps its vowel and tone marks", () => {
    expect(headingSlug("กฎของตัวอักษรที่ซ้ำ")).toBe("กฎของตัวอักษรที่ซ้ำ");
    expect(headingSlug("Guess และ State")).toBe("guess-และ-state");
  });
});

describe("tocOf", () => {
  test("lists ## and ### in order, not # or ####", () => {
    const body = "# Title\n\n## One\n\nText.\n\n### Two\n\n#### Three\n";
    expect(tocOf(body)).toEqual([
      { kind: "heading", depth: 2, text: "One", id: "one" },
      { kind: "heading", depth: 3, text: "Two", id: "two" },
    ]);
  });

  test("skips headings and Widgets inside fenced code", () => {
    expect(tocOf('```python\n## not a heading\n<FeedbackScorer id="x" />\n```\n\n## Real\n')).toEqual([
      { kind: "heading", depth: 2, text: "Real", id: "real" },
    ]);
  });

  test("a repeated heading gets a numbered id", () => {
    expect(tocOf("## Notes\n\n## Notes\n").map((e) => e.id)).toEqual(["notes", "notes-1"]);
  });

  test("inline code and emphasis are shown as plain text", () => {
    expect(tocOf("## The `score` *function*\n")).toEqual([
      { kind: "heading", depth: 2, text: "The score function", id: "the-score-function" },
    ]);
  });

  test("Widgets with an id are listed under their title, in order with the headings", () => {
    const body = '## Try it\n\n<FeedbackScorer id="fb" guess="speed" />\n\n## Then\n\n<StepThroughGame\n  answer="watch"\n  id="free"\n/>\n';
    expect(tocOf(body)).toEqual([
      { kind: "heading", depth: 2, text: "Try it", id: "try-it" },
      { kind: "widget", widget: "FeedbackScorer", text: "Feedback scorer", id: "widget-fb" },
      { kind: "heading", depth: 2, text: "Then", id: "then" },
      { kind: "widget", widget: "StepThroughGame", text: "Step-through Game", id: "widget-free" },
    ]);
  });

  test("a Widget with no id, and a tag that is not a Widget, are left out", () => {
    expect(tocOf('<BenchmarkChart />\n\n<Boards title="x" id="b">\n</Boards>\n')).toEqual([]);
  });
});

describe("rehype-toc-anchors", () => {
  test("gives the same ids as tocOf", async () => {
    const src = '## Two word lists\n\nText.\n\n<FeedbackScorer id="fb" />\n\n### salet or slate?\n\n## Two word lists\n';
    const out = await js(src);
    for (const { id } of tocOf(src)) expect(out).toContain(`id: "${id}"`);
  });

  test("the Widget anchor comes right before the Widget", async () => {
    const out = await js('Text.\n\n<FeedbackScorer id="fb" />\n');
    expect(out.indexOf('id: "widget-fb"')).toBeLessThan(out.indexOf("FeedbackScorer, {"));
    expect(out).toContain('className: "widget-anchor"');
  });
});
