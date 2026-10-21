import { expect, test } from "bun:test";
import GLOSSARY from "@content/glossary.json";
import GLOSSARY_TH from "@content/th/glossary.json";
import { checkGlossary, glossary, lookupMark, lookupTerm, parseMarkKinds, splitDefinition } from "@/lib/glossary";

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

test("lookups default to English and take a language", () => {
  expect(lookupTerm("Candidate Set", "en")).toBe(lookupTerm("Candidate Set"));
  expect(lookupMark("present", "en")).toEqual(lookupMark("present"));
});

test("the Thai glossary has exactly the English term names, in the same order", () => {
  expect(GLOSSARY_TH.map((e) => e.term)).toEqual(GLOSSARY.map((e) => e.term));
  expect(() => checkGlossary("content/th/glossary.json", GLOSSARY, GLOSSARY_TH)).not.toThrow();
});

test("checkGlossary fails, naming the file, on a missing, extra, duplicate or empty term", () => {
  const en = [{ term: "Game", definition: "a" }, { term: "Win", definition: "b" }];
  expect(() => checkGlossary("th.json", en, [{ term: "Game", definition: "ก" }])).toThrow(/th\.json: missing glossary term "Win"/);
  expect(() => checkGlossary("th.json", en, [...en, { term: "Loss", definition: "ก" }])).toThrow(/th\.json: glossary term "Loss" not in the English glossary/);
  expect(() => checkGlossary("th.json", en, [en[0], en[1], en[1]])).toThrow(/"Win" is defined twice/);
  expect(() => checkGlossary("th.json", en, [en[0], { term: "Win", definition: " " }])).toThrow(/"Win" has an empty definition/);
});

test("checkGlossary needs the Thai Mark entry to keep the **Correct** (...) shape", () => {
  const en = [{ term: "Mark", definition: SENTENCE }];
  expect(() => checkGlossary("th.json", en, [{ term: "Mark", definition: "ผลตัดสิน" }])).toThrow(/Correct/);
});

test("Thai lookups return Thai definitions, and Thai Mark kinds parse", () => {
  expect(lookupTerm("candidate set", "th").definition).toBe(GLOSSARY_TH.find((e) => e.term === "Candidate Set")!.definition);
  expect(lookupTerm("Candidate Set", "th").definition).not.toBe(lookupTerm("Candidate Set").definition);
  const kinds = parseMarkKinds(lookupTerm("Mark", "th").definition);
  expect(Object.values(kinds).every((d) => /[\u0E00-\u0E7F]/.test(d))).toBe(true);
  expect(lookupMark("present", "th")).toEqual({ name: "Present", definition: kinds.present });
});

test("splitDefinition links English term names inside a Thai definition, with Thai text around them", () => {
  const terms = [...glossary("th").values()].map((e) => e.term);
  const parts = splitDefinition(lookupTerm("Loss", "th").definition, terms, ["Loss"]);
  expect(parts.filter((p) => p.kind === "term").map((p) => p.text)).toEqual(["Game", "Guess Limit", "Win"]);
  expect(parts.some((p) => p.kind === "text" && /[\u0E00-\u0E7F]/.test(p.text))).toBe(true);
});

test("every term linked inside a Thai definition is a Thai glossary entry", () => {
  const terms = [...glossary("th").values()].map((e) => e.term);
  for (const e of glossary("th").values()) {
    for (const p of splitDefinition(e.definition, terms, [e.term])) {
      if (p.kind === "term") expect(lookupTerm(p.term, "th").term).toBe(p.term);
    }
  }
});
