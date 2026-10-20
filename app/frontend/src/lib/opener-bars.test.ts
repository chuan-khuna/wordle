import { expect, test } from "bun:test";
import { ANSWER_COUNT, barOf, groupOpeners } from "@/lib/opener-bars";

const average = (total: number) => total / ANSWER_COUNT;
const opener = (rank: number, total: number) => ({ rank, average_guess_count: average(total) });

test("barOf rounds half-up at the .xx5 edges", () => {
  // 3.525 * 2315 = 8160.375: 8160 is just under the edge, 8161 just over it.
  expect(barOf(average(8160))).toBe(352);
  expect(barOf(average(8161))).toBe(353);
  // 3.505 * 2315 = 8114.075, 3.515 * 2315 = 8137.225
  expect(barOf(average(8114))).toBe(350);
  expect(barOf(average(8115))).toBe(351);
  expect(barOf(average(8137))).toBe(351);
  expect(barOf(average(8138))).toBe(352);
});

test("barOf ignores float error in the average", () => {
  expect(barOf(average(8160) - 1e-9)).toBe(352);
  expect(barOf(average(8161) + 1e-9)).toBe(353);
  expect(barOf(3.5)).toBe(350);
  expect(barOf(4.117)).toBe(412); // not an exact total: rounded to the nearest one first
});

test("barOf is monotonic and within half a bar of the average", () => {
  let before = 0;
  for (let total = 3 * ANSWER_COUNT; total <= 5 * ANSWER_COUNT; total++) {
    const bar = barOf(average(total));
    expect(bar).toBeGreaterThanOrEqual(before);
    expect(Math.abs(bar - (100 * total) / ANSWER_COUNT)).toBeLessThanOrEqual(0.5);
    before = bar;
  }
});

test("groupOpeners stacks each bar in rank order, whatever the input order", () => {
  const bars = groupOpeners([opener(3, 8161), opener(1, 8161), opener(2, 8162)]);
  expect(bars).toHaveLength(1);
  expect(bars[0].hundredths).toBe(353);
  expect(bars[0].openers.map((o) => o.rank)).toEqual([1, 2, 3]);
});

test("groupOpeners keeps the empty bars between the first and last occupied ones", () => {
  const bars = groupOpeners([opener(1, 8160), opener(2, 8200)]); // 3.52 and 3.54
  expect(bars.map((b) => b.hundredths)).toEqual([352, 353, 354]);
  expect(bars.map((b) => b.openers.length)).toEqual([1, 0, 1]);
});

test("groupOpeners of nothing is no bars", () => {
  expect(groupOpeners([])).toEqual([]);
});
