import { describe, expect, test } from "bun:test";
import { compile } from "@mdx-js/mdx";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import rehypeMarginNotes from "./rehype-margin-notes.mjs";

async function js(src: string) {
  return String(await compile(src, { remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex, rehypeMarginNotes] }));
}

describe("rehype-margin-notes", () => {
  test("a note on its own line is wrapped with the paragraph before it", async () => {
    const out = await js("Text.\n\n<MarginNote>Aside</MarginNote>\n\nNext.");
    expect(out).toContain('className: "margin-row"');
    // The row holds the paragraph and the note; the next paragraph is outside it.
    expect(out.indexOf("Text.")).toBeLessThan(out.indexOf("MarginNote,"));
    expect(out.indexOf("MarginNote,")).toBeLessThan(out.indexOf("Next."));
  });

  test("a note after display maths is wrapped with the formula", async () => {
    const out = await js("Text.\n\n$$\nx = 1\n$$\n\n<MarginNote>Aside</MarginNote>\n\nNext.");
    expect(out).toContain('className: "margin-row"');
    expect(out.indexOf("katex-display")).toBeLessThan(out.indexOf("MarginNote,"));
    expect(out.indexOf("MarginNote,")).toBeLessThan(out.indexOf("Next."));
  });

  test("two notes after one block share a row", async () => {
    const out = await js("Text.\n\n<MarginNote>A</MarginNote>\n\n<MarginNote>B</MarginNote>");
    expect(out.match(/margin-row/g)).toHaveLength(1);
  });

  test("a note inside a paragraph is left where it is", async () => {
    const out = await js("Text <MarginNote>Aside</MarginNote> more.");
    expect(out).not.toContain("margin-row");
  });

  test("a note with no block before it is left alone", async () => {
    const out = await js("<MarginNote>Aside</MarginNote>\n\nText.");
    expect(out).not.toContain("margin-row");
  });
});
