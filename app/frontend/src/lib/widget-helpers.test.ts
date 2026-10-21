import { expect, test } from "bun:test";
import { pickStrategies, strategyColor, toggleStrategy } from "@/components/widgets/BenchmarkChart";
import { parseHighlight, parseTop } from "@/components/widgets/OpenerTable";

test("parseTop falls back for bad counts and caps at 500", () => {
  expect(parseTop("10")).toBe(10);
  expect(parseTop("0")).toBe(20);
  expect(parseTop("")).toBe(20);
  expect(parseTop("9999")).toBe(500);
});

test("parseHighlight keeps five-letter words only", () => {
  expect([...parseHighlight("Crane, slate nope,x")]).toEqual(["crane", "slate"]);
});

test("pickStrategies keeps order, drops unknown ids, falls back to all", () => {
  const all = [{ id: "a" }, { id: "b" }, { id: "c" }];
  expect(pickStrategies(all, "c,a,zzz")).toEqual([{ id: "c" }, { id: "a" }]);
  expect(pickStrategies(all, "zzz")).toEqual(all);
});

test("toggleStrategy keeps the API order and never unticks the last Strategy", () => {
  const order = ["a", "b", "c"];
  expect(toggleStrategy(order, ["c", "a"], "b")).toBe("a,b,c");
  expect(toggleStrategy(order, ["a", "b", "c"], "b")).toBe("a,c");
  expect(toggleStrategy(order, ["b"], "b")).toBe("b");
});

test("strategyColor shares a hue between the two Rankings of one Guess Pool and Search Scope", () => {
  expect(strategyColor("bits-guesses-all")).toBe("var(--correct)");
  expect(strategyColor("expected-guesses-all")).toContain("var(--correct)");
  expect(strategyColor("expected-guesses-all")).not.toBe("var(--correct)");
  expect(new Set(["answers-candidates", "answers-all", "guesses-candidates", "guesses-all"].map((k) => strategyColor(`bits-${k}`))).size).toBe(4);
});
