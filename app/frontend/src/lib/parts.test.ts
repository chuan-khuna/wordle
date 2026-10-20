import { expect, test } from "bun:test";
import { formatNumber, validateParts } from "@/lib/parts";

const parts = [{ id: "a" }, { id: "b" }];
const art = (slug: string, part: unknown, order: number) => ({ slug, file: `content/articles/${slug}.mdx`, part, number: order });

test("formatNumber always has two digits", () => {
  expect(formatNumber(1)).toBe("01");
  expect(formatNumber(11)).toBe("11");
});

test("a valid layout passes, whatever the input order", () => {
  expect(() => validateParts(parts, [art("z", "b", 3), art("x", "a", 1), art("y", "a", 2)], "series")).not.toThrow();
});

test("unknown and missing Parts name the file", () => {
  expect(() => validateParts(parts, [art("x", "a", 1), art("y", "nope", 2), art("z", "b", 3)], "series")).toThrow(
    /content\/articles\/y\.mdx: unknown Part "nope"/,
  );
  expect(() => validateParts(parts, [art("x", undefined, 1)], "series")).toThrow(/x\.mdx: frontmatter "part" is missing/);
});

test("a Part with no Articles fails", () => {
  expect(() => validateParts(parts, [art("x", "a", 1)], "content/series.mdx")).toThrow(/series\.mdx: Part "b" has no Articles/);
});

test("a Part's Articles must be consecutive", () => {
  expect(() => validateParts(parts, [art("x", "a", 1), art("y", "b", 2), art("z", "a", 3)], "series")).toThrow(
    /y\.mdx: Part "a" is not consecutive/,
  );
});

test("a repeated Part id fails", () => {
  expect(() => validateParts([{ id: "a" }, { id: "a" }], [art("x", "a", 1)], "series")).toThrow(/used twice/);
});

import { parseArticleFiles } from "@/lib/parts";

test("parseArticleFiles splits number and slug", () => {
  expect(parseArticleFiles(["02-b-c.mdx", "01-a.mdx"])).toEqual([
    { name: "01-a", number: 1, slug: "a" },
    { name: "02-b-c", number: 2, slug: "b-c" },
  ]);
});

test("parseArticleFiles rejects bad names, duplicates, gaps and repeated slugs", () => {
  expect(() => parseArticleFiles(["1-a.mdx"])).toThrow(/1-a\.mdx: Article file names must be NN-slug\.mdx/);
  expect(() => parseArticleFiles(["a.mdx"])).toThrow(/a\.mdx: Article file names/);
  expect(() => parseArticleFiles(["001-a.mdx"])).toThrow(/Article file names/);
  expect(() => parseArticleFiles(["01-a.mdx", "01-b.mdx"])).toThrow(/01-b\.mdx: number 01 is also used by 01-a\.mdx/);
  expect(() => parseArticleFiles(["01-a.mdx", "03-b.mdx"])).toThrow(/03-b\.mdx: numbers must run 01\.\.02 with no gaps; expected 02/);
  expect(() => parseArticleFiles(["01-a.mdx", "02-a.mdx"])).toThrow(/slug "a" is also used by 01-a/);
});
