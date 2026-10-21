import { expect, test } from "bun:test";
import { buildContent, type RawContent } from "@/lib/content";

const raw = (over: Partial<RawContent> = {}): RawContent => ({
  seriesFile: "content/series.mdx",
  series: { title: "S", intro: "i", parts: [{ id: "p", title: "P", intro: "pi" }] },
  articles: [
    { slug: "a", fileName: "01-a", number: 1, file: "content/articles/01-a.mdx", data: { title: "A", summary: "sa", part: "p" } },
    { slug: "b", fileName: "02-b", number: 2, file: "content/articles/02-b.mdx", data: { title: "B", summary: "sb", part: "p", prerequisites: ["a"], video: "1:05" } },
  ],
  ...over,
});

test("buildContent assembles the Series, Parts, Articles and backlinks", () => {
  const { series, articles, backlinks } = buildContent(raw());
  expect(series.parts[0].articles.map((a) => a.slug)).toEqual(["a", "b"]);
  expect(articles[1]).toMatchObject({ title: "B", prerequisites: ["a"], number: 2, videoStart: 65 });
  expect(backlinks("a").map((a) => a.slug)).toEqual(["b"]);
});

test("buildContent names the file for an unknown Prerequisite", () => {
  const bad = raw();
  bad.articles[1].data.prerequisites = ["zzz"];
  expect(() => buildContent(bad)).toThrow(/02-b\.mdx: unknown Prerequisite "zzz"/);
});

test("buildContent names the file for a missing title", () => {
  const bad = raw();
  delete bad.articles[0].data.title;
  expect(() => buildContent(bad)).toThrow(/01-a\.mdx: frontmatter "title"/);
});

test("buildContent rejects a Prerequisite cycle", () => {
  const bad = raw();
  bad.articles[0].data.prerequisites = ["b"];
  expect(() => buildContent(bad)).toThrow(/cycle/);
});

const thai = (over: Partial<NonNullable<RawContent["translation"]>> = {}): NonNullable<RawContent["translation"]> => ({
  seriesFile: "content/th/series.mdx",
  series: { title: "ส", intro: "บทนำ", parts: [{ id: "p", title: "ภ", intro: "ภบ" }] },
  articles: [],
  ...over,
});

test("a Translation's Series title, intro, and Part title and intro replace the English ones", () => {
  const { series } = buildContent(raw({ translation: thai() }));
  expect(series).toMatchObject({ title: "ส", intro: "บทนำ" });
  expect(series.parts[0]).toMatchObject({ id: "p", number: 1, title: "ภ", intro: "ภบ" });
  expect(series.parts[0].articles.map((a) => a.slug)).toEqual(["a", "b"]);
});

test("English Articles are translated: true; untranslated ones keep their English text with translated: false", () => {
  expect(buildContent(raw()).articles.every((a) => a.translated)).toBe(true);
  const { articles, series } = buildContent(raw({ translation: thai() }));
  expect(articles[0]).toMatchObject({ title: "A", summary: "sa", translated: false });
  expect(series.parts[0].articles.map((a) => a.translated)).toEqual([false, false]);
});

test("a translated Article replaces its title and summary but takes Prerequisites, Part and number from English", () => {
  const t = thai({ articles: [{ slug: "b", file: "content/th/articles/02-b.mdx", data: { title: "บี", summary: "สรุป", prerequisites: [], part: "x", number: 9 } }] });
  const { articles } = buildContent(raw({ translation: t }));
  expect(articles[1]).toMatchObject({ title: "บี", summary: "สรุป", translated: true, prerequisites: ["a"], part: "p", number: 2 });
  expect(articles[0].translated).toBe(false);
});

test("a Translation fails on an unknown slug or a missing title", () => {
  const unknown = thai({ articles: [{ slug: "zzz", file: "content/th/articles/09-zzz.mdx", data: { title: "ซ", summary: "ซ" } }] });
  expect(() => buildContent(raw({ translation: unknown }))).toThrow(/09-zzz\.mdx: no English Article "zzz"/);
  const noTitle = thai({ articles: [{ slug: "a", file: "content/th/articles/01-a.mdx", data: { summary: "x" } }] });
  expect(() => buildContent(raw({ translation: noTitle }))).toThrow(/01-a\.mdx: frontmatter "title"/);
});

test("a Translation fails when its Part ids differ from the English ones", () => {
  const wrongId = thai({ series: { title: "ส", intro: "บ", parts: [{ id: "q", title: "ภ", intro: "ภบ" }] } });
  expect(() => buildContent(raw({ translation: wrongId }))).toThrow(/th\/series\.mdx: Part ids \[q\] must be the English ones \[p\]/);
  const extra = thai({ series: { title: "ส", intro: "บ", parts: [{ id: "p", title: "ภ", intro: "ภบ" }, { id: "q", title: "ภ", intro: "ภบ" }] } });
  expect(() => buildContent(raw({ translation: extra }))).toThrow(/Part ids/);
});

test("a Translation's Series file needs a title, an intro, and a title and intro per Part", () => {
  expect(() => buildContent(raw({ translation: thai({ series: { intro: "บ", parts: [{ id: "p", title: "ภ", intro: "ภบ" }] } }) }))).toThrow(/th\/series\.mdx: frontmatter "title"/);
  expect(() => buildContent(raw({ translation: thai({ series: { title: "ส", intro: "บ", parts: [{ id: "p", title: "ภ" }] } }) }))).toThrow(/parts\[0\]\): frontmatter "intro"/);
});

test("a Translation's file name must be the English file's", () => {
  const t = thai({ articles: [{ slug: "b", fileName: "05-b", file: "content/th/articles/05-b.mdx", data: { title: "บี", summary: "ส" } }] });
  expect(() => buildContent(raw({ translation: t }))).toThrow(/05-b\.mdx: its name must be the English file's, 02-b\.mdx/);
  const ok = thai({ articles: [{ slug: "b", fileName: "02-b", file: "content/th/articles/02-b.mdx", data: { title: "บี", summary: "ส" } }] });
  expect(buildContent(raw({ translation: ok })).articles[1].translated).toBe(true);
});

test("a Translation fails on a missing or empty summary", () => {
  const t = thai({ articles: [{ slug: "a", file: "content/th/articles/01-a.mdx", data: { title: "เอ", summary: "  " } }] });
  expect(() => buildContent(raw({ translation: t }))).toThrow(/01-a\.mdx: frontmatter "summary"/);
});

test("a Translation's video, source and other English-only keys are ignored", () => {
  const t = thai({ articles: [{ slug: "b", file: "content/th/articles/02-b.mdx", data: { title: "บี", summary: "ส", video: "9:99", source: "abc" } }] });
  expect(buildContent(raw({ translation: t })).articles[1].videoStart).toBe(65);
});
