import { expect, test } from "bun:test";
import { articleLink, articlePath, homePath, languageOf, openersPath, pathIn } from "@/lib/paths";

test("pathIn swaps English paths to Thai", () => {
  expect(pathIn("/", "th")).toBe("/th");
  expect(pathIn("/articles/rules", "th")).toBe("/th/articles/rules");
  expect(pathIn("/openers", "th")).toBe("/th/openers");
});

test("pathIn swaps Thai paths to English", () => {
  expect(pathIn("/th", "en")).toBe("/");
  expect(pathIn("/th/articles/rules", "en")).toBe("/articles/rules");
  expect(pathIn("/th/openers", "en")).toBe("/openers");
});

test("pathIn leaves a path already in the language alone", () => {
  expect(pathIn("/articles/rules", "en")).toBe("/articles/rules");
  expect(pathIn("/th/articles/rules", "th")).toBe("/th/articles/rules");
  expect(pathIn("/th", "th")).toBe("/th");
});

test("pathIn round-trips", () => {
  for (const p of ["/", "/articles/rules", "/openers"]) {
    expect(pathIn(pathIn(p, "th"), "en")).toBe(p);
    expect(pathIn(pathIn(pathIn(p, "th"), "en"), "th")).toBe(pathIn(p, "th"));
  }
});

test("languageOf reads only a whole /th segment", () => {
  expect(languageOf("/th")).toBe("th");
  expect(languageOf("/th/openers")).toBe("th");
  expect(languageOf("/articles/rules")).toBe("en");
  expect(languageOf("/thanks")).toBe("en");
  expect(pathIn("/thanks", "th")).toBe("/th/thanks");
});

test("the named helpers build each page's path, English by default", () => {
  expect(homePath()).toBe("/");
  expect(homePath("th")).toBe("/th");
  expect(articlePath("rules")).toBe("/articles/rules");
  expect(articlePath("rules", "th")).toBe("/th/articles/rules");
  expect(openersPath("th")).toBe("/th/openers");
});

test("articleLink points an untranslated Article at its English page", () => {
  expect(articleLink({ slug: "rules", translated: true }, "th")).toBe("/th/articles/rules");
  expect(articleLink({ slug: "rules", translated: false }, "th")).toBe("/articles/rules");
  expect(articleLink({ slug: "rules", translated: false })).toBe("/articles/rules");
});
