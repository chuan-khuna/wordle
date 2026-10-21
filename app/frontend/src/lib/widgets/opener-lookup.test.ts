import { expect, test } from "bun:test";
import { ANSWER_COUNT } from "@/lib/widgets/opener-bars";
import { lookupOpener } from "@/lib/widgets/opener-lookup";

const row = (rank: number, word: string, total: number, is_answer: boolean) => ({
  rank,
  word,
  average_guess_count: total / ANSWER_COUNT,
  losses: 0,
  is_answer,
});
const openers = [row(1, "tarse", 8161, false), row(2, "salet", 8161, true), row(3, "crane", 8200, true)];

test("a word under five letters is not looked up yet", () => {
  expect(lookupOpener(openers, "", false).kind).toBe("incomplete");
  expect(lookupOpener(openers, "tar", false).kind).toBe("incomplete");
});

test("an unknown word is reported as such, whatever its case", () => {
  expect(lookupOpener(openers, "ZZZZZ", false)).toEqual({ kind: "unknown", word: "zzzzz" });
});

test("a found word has its rank, bar and the size of its bar", () => {
  const found = lookupOpener(openers, " TARSE ", false);
  expect(found).toMatchObject({ kind: "found", of: 3, hundredths: 353, inBar: 2, charted: true });
  if (found.kind === "found") expect(found.opener.rank).toBe(1);
});

test("with the Answer List filter on, a word off the list is found but not charted, and the bar count shrinks", () => {
  expect(lookupOpener(openers, "tarse", true)).toMatchObject({ kind: "found", charted: false, inBar: 1 });
  expect(lookupOpener(openers, "salet", true)).toMatchObject({ kind: "found", charted: true, inBar: 1 });
});

import { sortLookups } from "@/lib/widgets/opener-lookup";

test("sortLookups puts found words in rank order and unknown ones last, in the order typed", () => {
  const lookups = ["crane", "zzzzz", "salet", "yyyyy", "tarse"].map((w) => lookupOpener(openers, w, false));
  const sorted = sortLookups(lookups);
  expect(sorted.map((l) => (l.kind === "found" ? l.opener.word : l.kind === "unknown" ? l.word : "?"))).toEqual([
    "tarse",
    "salet",
    "crane",
    "zzzzz",
    "yyyyy",
  ]);
});
