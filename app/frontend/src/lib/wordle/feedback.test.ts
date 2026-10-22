import { describe, expect, test } from "bun:test";
import { marksToString, scoreFeedback, traceFeedback } from "./feedback";
import { formatState, parseState } from "../widgets/widget-state";

// The repeated-letter examples of docs/documents/feedback-scoring.md (0 Absent, 1 Present, 2 Correct).
const EXAMPLES: [string, string, string][] = [
  ["speed", "abide", "00101"],
  ["lllll", "hello", "00220"],
  ["eerie", "crane", "00102"],
  ["bbaaa", "aabbb", "11110"],
  ["crane", "crane", "22222"],
];

describe("scoreFeedback", () => {
  for (const [guess, answer, expected] of EXAMPLES) {
    test(`${guess} against ${answer}`, () => {
      expect(marksToString(scoreFeedback(guess, answer))).toBe(expected);
    });
  }
});

describe("traceFeedback", () => {
  test("pass 2 spends the single E of abide on the first E only", () => {
    const t = traceFeedback("speed", "abide");
    expect(t.steps.find((s) => s.index === 2)).toMatchObject({ available: 1, mark: 1 });
    expect(t.steps.find((s) => s.index === 3)).toMatchObject({ available: 0, mark: 0 });
  });
  test("Correct letters are taken out of the pool before pass 2", () => {
    expect(traceFeedback("lllll", "hello").unused).toEqual({ h: 1, e: 1, o: 1 });
  });
});

describe("state format", () => {
  test("round trips", () => {
    const text = "crane:00102,slate:01200";
    expect(formatState(parseState(text))).toBe(text);
  });
  test("defaults feedback and drops malformed rows", () => {
    expect(formatState(parseState("crane, bad:123, slate:01200, 12345:00000"))).toBe("crane:00000,slate:01200");
  });
});

// Cross-check against the running backend (skipped when it is not up): `just web backend`.
const API = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";
const up = await fetch(`${API}/api/feedback?guess=crane&answer=crane`).then((r) => r.ok, () => false);

describe.skipIf(!up)("matches /api/feedback", () => {
  const pairs = [...EXAMPLES.map(([g, a]) => [g, a]), ["geese", "eerie"], ["array", "alley"], ["stare", "swell"]];
  for (const [guess, answer] of pairs) {
    test(`${guess} against ${answer}`, async () => {
      const r = await fetch(`${API}/api/feedback?guess=${guess}&answer=${answer}`);
      if (!r.ok) return; // not on the Guess List
      expect(((await r.json()) as { marks: string }).marks).toBe(marksToString(scoreFeedback(guess, answer)));
    });
  }
});
