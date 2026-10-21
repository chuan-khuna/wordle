import { expect, test } from "bun:test";
import { barPercent, chanceSentence, chartTitle, formatLeft, orderGroups, percent } from "@/lib/widgets/split-chart";

test("orderGroups: biggest first, ties by lower Feedback Code", () => {
  const out = orderGroups([
    { code: 9, count: 2 },
    { code: 4, count: 5 },
    { code: 3, count: 2 },
    { code: 242, count: 1 },
  ]);
  expect(out.map((g) => g.code)).toEqual([4, 3, 9, 242]);
});

test("percent is group size over Candidate Set size", () => {
  expect(percent(15, 49)).toBe("30.6%");
  expect(percent(1, 2315)).toBe("0.04%");
  expect(percent(23, 2315)).toBe("1.0%");
  expect(percent(5, 5)).toBe("100%");
  expect(percent(0, 0)).toBe("0%");
});

test("chanceSentence names the probability in full", () => {
  expect(chanceSentence(15, 49)).toBe("30.6% chance of this Feedback, leaving 15 words");
  expect(chanceSentence(1, 49)).toBe("2.0% chance of this Feedback, leaving 1 word");
});

test("barPercent is relative to the largest group, with a visible minimum", () => {
  expect(barPercent(50, 100)).toBe(50);
  expect(barPercent(100, 100)).toBe(100);
  expect(barPercent(1, 2000)).toBeGreaterThan(0);
});

test("title matches the gpui app", () => {
  expect(formatLeft(3.456)).toBe("3.5");
  expect(formatLeft(61.3)).toBe("61");
  expect(chartTitle(61.3, 5.1234)).toBe("Expected 61 words left · 5.12 bits");
});
