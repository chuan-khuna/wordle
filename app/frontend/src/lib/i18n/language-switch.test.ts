import { expect, test } from "bun:test";
import { switchTarget } from "@/lib/i18n/language-switch";

const translated = ["rules"];

test("English to Thai for the home page, the openers page and a translated Article", () => {
  expect(switchTarget("/", "th", translated)).toBe("/th");
  expect(switchTarget("/openers", "th", translated)).toBe("/th/openers");
  expect(switchTarget("/opener-split", "th", translated)).toBe("/th/opener-split");
  expect(switchTarget("/follow", "th", translated)).toBe("/th/follow");
  expect(switchTarget("/articles/rules", "th", translated)).toBe("/th/articles/rules");
});

test("an English Article without a Translation, and a page with no Thai twin, have no Thai target", () => {
  expect(switchTarget("/articles/solver", "th", translated)).toBeNull();
  expect(switchTarget("/articles/rules", "th", [])).toBeNull();
  expect(switchTarget("/type-lab", "th", translated)).toBeNull();
});

test("Thai to English always has a target", () => {
  expect(switchTarget("/th", "en", [])).toBe("/");
  expect(switchTarget("/th/openers", "en", [])).toBe("/openers");
  expect(switchTarget("/th/opener-split", "en", [])).toBe("/opener-split");
  expect(switchTarget("/th/follow", "en", [])).toBe("/follow");
  expect(switchTarget("/th/articles/rules", "en", [])).toBe("/articles/rules");
});

test("switching to the language you are in keeps the page", () => {
  expect(switchTarget("/openers", "en", translated)).toBe("/openers");
  expect(switchTarget("/th/articles/rules", "th", translated)).toBe("/th/articles/rules");
});
