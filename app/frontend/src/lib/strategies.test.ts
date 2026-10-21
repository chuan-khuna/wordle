import { expect, test } from "bun:test";
import { DEFAULT_STRATEGY, STRATEGIES, STRATEGY_GROUPS, shortName } from "@/lib/strategies";

test("the eight Strategies have the package's ids, names and order", () => {
  expect(STRATEGIES.map((s) => [s.id, s.name])).toEqual([
    ["bits-answers-candidates", "Expected Information, Answer List, Candidates only"],
    ["bits-answers-all", "Expected Information, Answer List, All words"],
    ["bits-guesses-candidates", "Expected Information, Guess List, Candidates only"],
    ["bits-guesses-all", "Expected Information, Guess List, All words"],
    ["expected-answers-candidates", "Expected Candidates, Answer List, Candidates only"],
    ["expected-answers-all", "Expected Candidates, Answer List, All words"],
    ["expected-guesses-candidates", "Expected Candidates, Guess List, Candidates only"],
    ["expected-guesses-all", "Expected Candidates, Guess List, All words"],
  ]);
  expect(STRATEGIES.find((s) => s.id === "bits-guesses-all")).toMatchObject({ by: "bits", pool: "guesses", scope: "global" });
  expect(STRATEGIES.some((s) => s.id === DEFAULT_STRATEGY)).toBe(true);
});

test("the groups are the two Rankings, four Strategies each, named without the Ranking", () => {
  expect(STRATEGY_GROUPS.map((g) => [g.label, g.strategies.length])).toEqual([
    ["Expected Information", 4],
    ["Expected Candidates", 4],
  ]);
  expect(STRATEGY_GROUPS[1].strategies.map(shortName)).toEqual([
    "Answer List, Candidates only",
    "Answer List, All words",
    "Guess List, Candidates only",
    "Guess List, All words",
  ]);
});
