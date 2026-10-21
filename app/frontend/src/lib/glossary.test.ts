import { expect, test } from "bun:test";
import { glossary, lookupMark, lookupTerm, parseMarkKinds, splitDefinition } from "@/lib/glossary";

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

test("splitDefinition links the first mention of each other term, longest first, plurals included", () => {
  const terms = ["Game", "Guess", "Guess Limit", "Candidate", "Candidate Set", "Strategy", "Win"];
  expect(splitDefinition("The most Guesses a Game allows, or none, so the Game only ends with a Win.", terms, ["Guess Limit"])).toEqual([
    { kind: "text", text: "The most " },
    { kind: "term", text: "Guesses", term: "Guess" },
    { kind: "text", text: " a " },
    { kind: "term", text: "Game", term: "Game" },
    { kind: "text", text: " allows, or none, so the Game only ends with a " },
    { kind: "term", text: "Win", term: "Win" },
    { kind: "text", text: "." },
  ]);
  expect(splitDefinition("Every Candidate Set, two Strategies.", terms).filter((p) => p.kind === "term")).toEqual([
    { kind: "term", text: "Candidate Set", term: "Candidate Set" },
    { kind: "term", text: "Strategies", term: "Strategy" },
  ]);
});

test("splitDefinition skips the given terms, lower-case words and bold runs", () => {
  expect(splitDefinition("A game: **Game** over, one Game.", ["Game"], ["game"])).toEqual([
    { kind: "text", text: "A game: " },
    { kind: "bold", text: "Game" },
    { kind: "text", text: " over, one Game." },
  ]);
  expect(splitDefinition("Played well.", ["Play"])).toEqual([{ kind: "text", text: "Played well." }]);
});

test("every glossary term found in a definition is a glossary entry", () => {
  const terms = [...glossary().values()].map((e) => e.term);
  for (const e of glossary().values()) {
    for (const p of splitDefinition(e.definition, terms, [e.term])) {
      if (p.kind === "term") expect(lookupTerm(p.term).term).toBe(p.term);
    }
  }
});
