import { expect, test } from "bun:test";
import { ANSWER_COUNT, barDomain, chartDomain, barOf, filterOpeners, groupOpeners, labelRows } from "@/lib/opener-bars";

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

const withAnswer = (rank: number, total: number, is_answer: boolean) => ({ ...opener(rank, total), is_answer });

test("filterOpeners keeps every Opener, or only those on the Answer List", () => {
  const all = [withAnswer(1, 8160, true), withAnswer(2, 8161, false), withAnswer(3, 8161, true)];
  expect(filterOpeners(all, false)).toEqual(all);
  expect(filterOpeners(all, true).map((o) => o.rank)).toEqual([1, 3]);
  expect(filterOpeners([], true)).toEqual([]);
});

test("grouping the filtered Openers drops the others from their bars and keeps rank order", () => {
  const all = [withAnswer(1, 8161, false), withAnswer(2, 8161, true), withAnswer(3, 8161, true), withAnswer(4, 8200, false)];
  const bars = groupOpeners(filterOpeners(all, true));
  expect(bars.map((b) => b.hundredths)).toEqual([353]);
  expect(bars[0].openers.map((o) => o.rank)).toEqual([2, 3]);
  expect(groupOpeners(filterOpeners([withAnswer(1, 8161, false)], true))).toEqual([]);
});

test("labelRows puts labels that would touch on different rows", () => {
  expect(labelRows([100, 110, 300, 105], 40)).toEqual([0, 2, 0, 1]);
  expect(labelRows([0, 40, 80], 40)).toEqual([0, 0, 0]);
  expect(labelRows([], 40)).toEqual([]);
});


test("barDomain is the first and last occupied bar and the tallest stack", () => {
  expect(barDomain([opener(1, 8160), opener(2, 8200), opener(3, 8200)])).toEqual({ first: 352, last: 354, tallest: 2 });
  expect(barDomain([])).toBeNull();
});

test("groupOpeners with the full domain gives a filtered list the same bars as the full list", () => {
  const all = [withAnswer(1, 8160, true), withAnswer(2, 8161, false), withAnswer(3, 8200, false), withAnswer(4, 8300, true)];
  const domain = barDomain(all)!;
  const full = groupOpeners(all);
  const answers = groupOpeners(filterOpeners(all, true), domain);
  expect(answers.map((b) => b.hundredths)).toEqual(full.map((b) => b.hundredths));
  expect(answers.reduce((n, b) => n + b.openers.length, 0)).toBe(2);
  expect(answers.find((b) => b.hundredths === 354)?.openers).toEqual([]);
  expect(groupOpeners([], domain)).toHaveLength(domain.last - domain.first + 1);
});

test("chartDomain takes x from every Opener and the tallest stack from the Openers shown", () => {
  const all = [withAnswer(1, 8160, true), withAnswer(2, 8161, false), withAnswer(3, 8161, false), withAnswer(4, 8300, true)];
  const everything = chartDomain(all, false)!;
  const answers = chartDomain(all, true)!;
  expect(everything.tallest).toBe(2);
  expect(answers.tallest).toBe(1);
  expect([answers.first, answers.last]).toEqual([everything.first, everything.last]);
  expect(chartDomain(all.filter((o) => !o.is_answer), true)).toMatchObject({ first: 353, last: 353, tallest: 1 });
  expect(chartDomain([], true)).toBeNull();
});
