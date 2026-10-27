import { expect, test } from "bun:test";
import { OPENER_PRESETS, presetFor, unionWords } from "@/lib/widgets/opener-presets";

const preset = (id: string) => OPENER_PRESETS.find((p) => p.id === id)!;

test("the union keeps first-seen order and drops repeats", () => {
  expect(unionWords(["a", "b"], ["b", "c"], ["a", "d"])).toEqual(["a", "b", "c", "d"]);
});

test("All is the other three lists in order, with no repeats", () => {
  const parts = ["best", "myths", "bad"].flatMap((id) => preset(id).words);
  expect(preset("all").words).toEqual(parts);
  expect(preset("all").words).toHaveLength(18);
});

test("a word list matches its preset in any order", () => {
  expect(presetFor(preset("myths").words)?.id).toBe("myths");
  expect(presetFor([...preset("bad").words].reverse())?.id).toBe("bad");
  expect(presetFor(preset("all").words)?.id).toBe("all");
});

test("no preset matches an empty, partial or extended list", () => {
  expect(presetFor([])).toBeUndefined();
  expect(presetFor(preset("best").words.slice(1))).toBeUndefined();
  expect(presetFor([...preset("best").words, "adieu"])).toBeUndefined();
});
