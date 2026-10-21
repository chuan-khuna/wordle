import { expect, test } from "bun:test";
import { LANGUAGES } from "@/lib/i18n/language";
import { EN, pageText, TH } from "@/lib/i18n/page-text";

test("pageText defaults to English and builds the parametrised strings", () => {
  expect(pageText()).toBe(pageText("en"));
  expect(pageText().part(2)).toBe("Part 2");
  expect(pageText().watchFrom("4:10")).toBe("Watch from 4:10");
});

test("every language has a table with every English key", () => {
  for (const lang of LANGUAGES) {
    expect(Object.keys(pageText(lang)).sort()).toEqual(Object.keys(EN).sort());
  }
});

test("the Thai table is Thai: no English sentence leaks, no ครับ/ค่ะ, glossary terms stay English", () => {
  const thai = /[\u0E00-\u0E7F]/;
  const strings: Record<string, string> = { ...TH, part: TH.part(2), watchFrom: TH.watchFrom("4:10"), splitGroupsLabel: TH.splitGroupsLabel("salet"), words: TH.words(5) };
  for (const [key, sample] of Object.entries(strings)) {
    // Glossary terms and the "EN" tag are English by design; every other string must contain Thai.
    if (!["series", "part", "openerDistribution", "openerSplit", "openerLabel", "feedbackLabel", "enTag", "sentenceEnd"].includes(key)) {
      expect(thai.test(sample), key).toBe(true);
    }
    expect(/ครับ|ค่ะ/.test(sample), key).toBe(false);
  }
  expect(TH.part(2)).toBe("Part 2");
  expect(TH.watchFrom("4:10")).toContain("4:10");
  expect(TH.words(5)).toContain("5");
});
