import { expect, test } from "bun:test";
import { columnCount, headSize, orderSplitGroups } from "@/lib/widgets/split-groups";

const group = (code: number, count: number, words: string[] = []) => ({ marks: String(code), code, count, words });

test("orderSplitGroups: biggest first, ties by lower Feedback Code", () => {
  const out = orderSplitGroups([group(9, 2), group(4, 5), group(3, 2), group(242, 1)]);
  expect(out.map((g) => g.code)).toEqual([4, 3, 9, 242]);
});

test("orderSplitGroups sorts each group's words alphabetically and leaves the input alone", () => {
  const input = [group(1, 3, ["crane", "abide", "bacon"])];
  expect(orderSplitGroups(input)[0].words).toEqual(["abide", "bacon", "crane"]);
  expect(input[0].words).toEqual(["crane", "abide", "bacon"]);
});

test("columnCount is about the square root of the word count", () => {
  expect(columnCount(1, 20)).toBe(1);
  expect(columnCount(2, 20)).toBe(2);
  expect(columnCount(9, 20)).toBe(3);
  expect(columnCount(10, 20)).toBe(4);
  expect(columnCount(16, 20)).toBe(4);
  expect(columnCount(168, 20)).toBe(13);
});

test("columnCount is never below 1 and never above the columns that fit", () => {
  expect(columnCount(0, 20)).toBe(1);
  expect(columnCount(100, 4)).toBe(4);
  expect(columnCount(100, 4.7)).toBe(4);
  expect(columnCount(100, 0)).toBe(1);
  expect(columnCount(100, 10)).toBe(10);
});

test("headSize shrinks with the group", () => {
  expect(headSize(300)).toBe("lg");
  expect(headSize(100)).toBe("lg");
  expect(headSize(99)).toBe("md");
  expect(headSize(25)).toBe("md");
  expect(headSize(24)).toBe("sm");
  expect(headSize(5)).toBe("sm");
  expect(headSize(4)).toBe("xs");
  expect(headSize(1)).toBe("xs");
});
