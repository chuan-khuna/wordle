import { expect, test } from "bun:test";
import { pickStrategies } from "@/components/widgets/BenchmarkChart";
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
