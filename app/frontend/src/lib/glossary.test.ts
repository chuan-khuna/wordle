import { expect, test } from "bun:test";
import { glossary, lookupMark, lookupTerm, parseMarkKinds } from "@/lib/glossary";

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

test("lookupTerm is case-insensitive and throws for an unknown term", () => {
  expect(lookupTerm("candidate set").term).toBe("Candidate Set");
  expect(() => lookupTerm("Pool")).toThrow(/not defined in content\/glossary.json/);
});

test("glossary.json defines all three kinds", () => {
  const entry = glossary().get("mark")!;
  expect(Object.values(parseMarkKinds(entry.definition)).every((d) => d.length > 5)).toBe(true);
  expect(lookupMark("absent").name).toBe("Absent");
});

test("lookupMark rejects an unknown kind", () => {
  expect(() => lookupMark("green")).toThrow(/unknown kind "green"/);
});
