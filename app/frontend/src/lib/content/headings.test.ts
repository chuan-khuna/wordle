import { describe, expect, test } from "bun:test";
import { compile } from "@mdx-js/mdx";
import { headingsOf } from "./headings";
import rehypeHeadingIds, { headingSlug } from "./rehype-heading-ids.mjs";

async function js(src: string) {
  return String(await compile(src, { rehypePlugins: [rehypeHeadingIds] }));
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

describe("headingsOf", () => {
  test("lists ## and ### in order, not # or ####", () => {
    const body = "# Title\n\n## One\n\nText.\n\n### Two\n\n#### Three\n";
    expect(headingsOf(body)).toEqual([
      { depth: 2, text: "One", id: "one" },
      { depth: 3, text: "Two", id: "two" },
    ]);
  });

  test("skips headings inside fenced code", () => {
    expect(headingsOf("```python\n## not a heading\n```\n\n## Real\n")).toEqual([{ depth: 2, text: "Real", id: "real" }]);
  });

  test("a repeated heading gets a numbered id", () => {
    expect(headingsOf("## Notes\n\n## Notes\n").map((h) => h.id)).toEqual(["notes", "notes-1"]);
  });

  test("inline code and emphasis are shown as plain text", () => {
    expect(headingsOf("## The `score` *function*\n")).toEqual([{ depth: 2, text: "The score function", id: "the-score-function" }]);
  });
});

describe("rehype-heading-ids", () => {
  test("gives the same ids as headingsOf", async () => {
    const src = "## Two word lists\n\nText.\n\n### salet or slate?\n\n## Two word lists\n";
    const out = await js(src);
    for (const { id } of headingsOf(src)) expect(out).toContain(`id: "${id}"`);
  });
});
