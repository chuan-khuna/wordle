import { expect, test } from "bun:test";
import { lookupMark, parseMarkKinds, parseGlossary } from "@/lib/glossary";
import { readFileSync } from "node:fs";

const SENTENCE =
  "The verdict on one letter of a Guess: **Correct** (in the Answer at this position), **Present** (in the Answer at a different position) or **Absent** (not in the Answer, or already accounted for).";

test("parseMarkKinds takes each kind's parenthetical", () => {
  expect(parseMarkKinds(SENTENCE)).toEqual({
    correct: "in the Answer at this position",
    present: "in the Answer at a different position",
    absent: "not in the Answer, or already accounted for",
  });
});

test("parseMarkKinds throws when a kind is missing", () => {
  expect(() => parseMarkKinds("**Correct** (a) or **Present** (b)")).toThrow(/Absent/);
});

test("the real GLOSSARY.md defines all three kinds", () => {
  const entry = parseGlossary(readFileSync("../../GLOSSARY.md", "utf8")).get("mark")!;
  expect(Object.values(parseMarkKinds(entry.definition)).every((d) => d.length > 5)).toBe(true);
  expect(lookupMark("absent").name).toBe("Absent");
});

test("lookupMark rejects an unknown kind", () => {
  expect(() => lookupMark("green")).toThrow(/unknown kind "green"/);
});
