import { expect, test } from "bun:test";
import { ANSWER_COUNT, groupOpeners } from "@/lib/widgets/opener-bars";
import { addWord, barColumn, columnHeading } from "@/lib/widgets/opener-column";

const row = (rank: number, word: string, total: number) => ({ rank, word, average_guess_count: total / ANSWER_COUNT });
const bars = groupOpeners([row(2, "salet", 8161), row(1, "tarse", 8161), row(3, "crane", 8200)]);

test("the heading is the bar's value and its count", () => {
  expect(columnHeading(343, 412)).toBe("3.43 · 412 Openers");
  expect(columnHeading(343, 1)).toBe("3.43 · 1 Opener");
  expect(columnHeading(350, 1234)).toBe("3.50 · 1,234 Openers");
});

test("a bar's column lists its Openers best first and flags the highlighted ones", () => {
  const column = barColumn(bars, 353, new Set(["salet"]));
  expect(column?.heading).toBe("3.53 · 2 Openers");
  expect(column?.rows.map((r) => [r.word, r.marked])).toEqual([
    ["tarse", false],
    ["salet", true],
  ]);
});

test("an empty bar has an empty column, and a bar outside the chart has none", () => {
  const gap = groupOpeners([row(1, "tarse", 8160), row(2, "crane", 8200)]); // 3.52, an empty 3.53, 3.54
  expect(barColumn(gap, 353, new Set())?.rows).toEqual([]);
  expect(barColumn(gap, 353, new Set())?.heading).toBe("3.53 · 0 Openers");
  expect(barColumn(gap, 999, new Set())).toBeNull();
});

test("addWord appends to the field, once", () => {
  expect(addWord("", "crane")).toBe("crane");
  expect(addWord("raise", "crane")).toBe("raise, crane");
  expect(addWord("raise, ", "crane")).toBe("raise, crane");
  expect(addWord("Raise, crane", "crane")).toBe("Raise, crane");
});
