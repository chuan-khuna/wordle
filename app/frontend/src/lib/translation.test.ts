import { expect, test } from "bun:test";
import { blobHash, checkTranslation, codeBlocks, countHeadings, extractWidgets, staleWarning } from "@/lib/translation";

const FILE = "content/th/articles/05-x.mdx";

const EN = `Intro with <Term>Game</Term> and <Word>crane</Word>.

## One

<FeedbackScorer id="fb" guess="speed" answer="abide" />

\`\`\`python title="Code"
x = 1  # a comment
\`\`\`

## Two

<StepThroughGame id="free" answer="watch" step={3} />
<Boards title="Losses">
  <Board pattern="_atch" guesses="raise watch" />
</Boards>
`;

/** The English body with prose changed but the structure kept. */
const TH = EN.replace("Intro with", "สวัสดี").replace("## One", "## หนึ่ง").replace("## Two", "## สอง");

test("a body matches itself, and a Translation with different prose and the same structure", () => {
  expect(() => checkTranslation(FILE, EN, EN)).not.toThrow();
  expect(() => checkTranslation(FILE, EN, TH)).not.toThrow();
});

test("a missing Widget fails, naming the file and the first mismatch", () => {
  const th = TH.replace('<FeedbackScorer id="fb" guess="speed" answer="abide" />\n', "");
  expect(() => checkTranslation(FILE, EN, th)).toThrow(/05-x\.mdx: Widget 1 differs\. English has <FeedbackScorer answer="abide" guess="speed" id="fb">, the Translation has <StepThroughGame/);
});

test("an extra Widget fails", () => {
  const th = TH + '\n<OpenerTable id="op" />\n';
  expect(() => checkTranslation(FILE, EN, th)).toThrow(/Widget 5 differs\. English has no Widget here, the Translation has <OpenerTable id="op">/);
});

test("a reordered Widget fails", () => {
  const th = TH.replace('<FeedbackScorer id="fb" guess="speed" answer="abide" />', "<<SWAP>>").replace('<StepThroughGame id="free" answer="watch" step={3} />', '<FeedbackScorer id="fb" guess="speed" answer="abide" />').replace("<<SWAP>>", '<StepThroughGame id="free" answer="watch" step={3} />');
  expect(() => checkTranslation(FILE, EN, th)).toThrow(/Widget 1 differs/);
});

test("a renamed Widget, a changed id and a changed prop fail", () => {
  expect(() => checkTranslation(FILE, EN, TH.replace("<FeedbackScorer", "<CandidateFilter"))).toThrow(/Widget 1 differs/);
  expect(() => checkTranslation(FILE, EN, TH.replace('id="fb"', 'id="fb2"'))).toThrow(/Widget 1 differs/);
  expect(() => checkTranslation(FILE, EN, TH.replace('guess="speed"', 'guess="speeD"'))).toThrow(/Widget 1 differs/);
  expect(() => checkTranslation(FILE, EN, TH.replace("step={3}", "step={4}"))).toThrow(/Widget 2 differs/);
  expect(() => checkTranslation(FILE, EN, TH.replace('title="Losses"', 'title="การแพ้"'))).toThrow(/Widget 3 differs/);
});

test("prop order does not matter, but a dropped or added prop does", () => {
  expect(() => checkTranslation(FILE, EN, TH.replace('id="fb" guess="speed" answer="abide"', 'answer="abide" guess="speed" id="fb"'))).not.toThrow();
  expect(() => checkTranslation(FILE, EN, TH.replace(' answer="abide"', ""))).toThrow(/Widget 1 differs/);
  expect(() => checkTranslation(FILE, EN, TH.replace('step={3}', "step={3} tabs"))).toThrow(/Widget 2 differs/);
});

test("a changed number of ## headings fails; ### headings do not count", () => {
  expect(() => checkTranslation(FILE, EN, TH + "\n## สาม\n")).toThrow(/05-x\.mdx: the Translation has 3 "##" headings but the English original has 2/);
  expect(() => checkTranslation(FILE, EN, TH + "\n### ย่อย\n")).not.toThrow();
  expect(() => checkTranslation(FILE, EN, TH.replace("## สอง", "สอง"))).toThrow(/1 "##" headings but the English original has 2/);
});

test("a changed code block fails, naming the line", () => {
  const th = TH.replace("x = 1  # a comment", "x = 1  # หมายเหตุ");
  expect(() => checkTranslation(FILE, EN, th)).toThrow(/code block 1 differs from the English original at its line 2: English has "x = 1  # a comment", the Translation has "x = 1  # หมายเหตุ"/);
  expect(() => checkTranslation(FILE, EN, TH.replace('title="Code"', 'title="โค้ด"'))).toThrow(/code block 1 differs/);
});

test("a missing or extra code block fails", () => {
  const th = TH.replace(/```python[\s\S]*?```\n/, "");
  expect(() => checkTranslation(FILE, EN, th)).toThrow(/code block 1 is missing from the English original|code block 1 .*missing/);
  expect(() => checkTranslation(FILE, EN, TH + "\n```\nmore\n```\n")).toThrow(/code block 2 is not in the English original/);
});

test("prose components are ignored: added, dropped or moved", () => {
  const th = TH.replace("<Term>Game</Term>", "Game").replace("<Word>crane</Word>", "<Word>crane</Word> <Letter>c</Letter> <MarginNote>note</MarginNote> <Mark kind=\"correct\" />");
  expect(() => checkTranslation(FILE, EN, th)).not.toThrow();
});

test("Widget-looking text and headings inside fenced code or inline code are ignored", () => {
  const en = "## A\n\n```mdx\n## not a heading\n<FeedbackScorer id=\"x\" />\n```\n\nUse `<StepThroughGame id=\"y\" />` here.\n";
  expect(extractWidgets(en)).toEqual([]);
  expect(countHeadings(en)).toBe(1);
  expect(codeBlocks(en)).toHaveLength(1);
  expect(() => checkTranslation(FILE, en, en.replace("not a heading", "not a heading")) ).not.toThrow();
});

test("extractWidgets reads quoted, braced and bare props, including a > inside braces", () => {
  const [w] = extractWidgets('<OpenerTable id="op" top={10} fn={(a) => a > 1} highlight=\'crane,slate\' tabs />');
  expect(w.tag).toBe("OpenerTable");
  expect(w.props).toEqual({ id: '"op"', top: "{10}", fn: "{(a) => a > 1}", highlight: "'crane,slate'", tabs: "true" });
});

test("blobHash is git's blob hash", () => {
  // `printf 'hello\n' | git hash-object --stdin`
  expect(blobHash(new TextEncoder().encode("hello\n"))).toBe("ce013625030ba8dba906f756967f9e9ca394464a");
});

test("a current source hash gives no warning; a stale or missing one gives a warning naming both files", () => {
  const now = "a".repeat(40);
  expect(staleWarning(FILE, "content/articles/05-x.mdx", now, now)).toBeNull();
  const stale = staleWarning(FILE, "content/articles/05-x.mdx", "b".repeat(40), now)!;
  expect(stale).toContain("05-x.mdx");
  expect(stale).toContain("content/articles/05-x.mdx");
  expect(stale).toContain(`set source to ${now}`);
  expect(staleWarning(FILE, "e.mdx", undefined, now)).toContain("(none)");
});
