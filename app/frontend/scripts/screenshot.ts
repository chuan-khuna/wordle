/**
 * Screenshots of the website's highlights, taken with Playwright's Chromium against a running server: for each
 * page, the top of the page (title and intro, one viewport) and every figure in it (each Widget and each
 * `<Boards>`, all drawn by WidgetFrame), cropped to the figure.
 *
 *   bun run screenshot                              every page, default theme, desktop width
 *   bun run screenshot articles/rules openers       only these paths (the leading slash is optional)
 *   bun run screenshot th th/openers                only the Thai pages (every run without paths includes them)
 *   bun run screenshot --theme nord --mobile        another theme, phone width
 *   bun run screenshot --theme all                  every page in all ten themes
 *   bun run screenshot --full-page                  one full-page shot per page instead
 *
 * Shots go to <out>/<page>/<NN>-<name>.<theme>.<width>.png, e.g. screenshots/articles_rules/02-feedback-scorer.nord.1440.png.
 * Options: --url (default http://localhost:3000), --out (default screenshots/), --theme <id|all>,
 * --width, --height, --mobile (390x844), --full-page.
 * Start the site first (`just web`); the Widgets need the backend for their data.
 */
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { chromium, type Page } from "playwright";
import { parseArticleFiles } from "../src/lib/content/parts";
import { DEFAULT_THEME, STORAGE_KEY } from "../src/lib/theme/theme-script";
import { THEMES } from "../src/lib/theme/themes";

const root = path.resolve(import.meta.dir, "..");

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: {
    url: { type: "string", default: "http://localhost:3000" },
    out: { type: "string", default: path.join(root, "screenshots") },
    theme: { type: "string", default: DEFAULT_THEME },
    width: { type: "string", default: "1440" },
    height: { type: "string", default: "900" },
    mobile: { type: "boolean", default: false },
    "full-page": { type: "boolean", default: false },
  },
});

/** A WidgetFrame: every Widget and every <Boards> is a labelled section whose first child is its eyebrow title. */
const FIGURE = "section[aria-label]:has(> h3.eyebrow)";

/** The home page, every Article, and the Opener Distribution page, then the Thai pages (`/th`, `/th/openers` and every Article that has a Translation). */
function allPaths(): string[] {
  const files = readdirSync(path.join(root, "content/articles")).filter((f) => f.endsWith(".mdx"));
  const thaiDir = path.join(root, "content/th/articles");
  const thai = existsSync(thaiDir) ? readdirSync(thaiDir).filter((f) => f.endsWith(".mdx")).sort().map((f) => `/th/articles/${f.replace(/^\d{2}-/, "").replace(/\.mdx$/, "")}`) : [];
  return ["/", ...parseArticleFiles(files).map((a) => `/articles/${a.slug}`), "/openers", "/th", ...thai, "/th/openers"];
}

/** "Feedback Split explorer" -> "feedback-split-explorer". */
function slugify(text: string): string {
  return text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "figure";
}

const ids: string[] = THEMES.map((t) => t.id);
const themes = values.theme === "all" ? ids : [values.theme];
for (const theme of themes) {
  if (!ids.includes(theme)) throw new Error(`Unknown theme "${theme}". Use one of: all, ${ids.join(", ")}.`);
}

// Paths may leave out the leading slash ("articles/rules"), which Git Bash would otherwise turn into a Windows path.
const paths = positionals.length ? positionals.map((p) => (p.startsWith("/") ? p : `/${p}`)) : allPaths();
const viewport = values.mobile
  ? { width: 390, height: 844 }
  : { width: Number(values.width), height: Number(values.height) };
const size = values.mobile ? "mobile" : `${viewport.width}`;

/** Load a page and wait until it is settled: network quiet, fonts in, no Widget still saying "Loading…". */
async function open(page: Page, p: string) {
  await page.goto(new URL(p, values.url).href, { waitUntil: "networkidle" });
  // Hide the dev server's Next.js badge, which sits over the page.
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.evaluate(() => document.fonts.ready);
  await page
    .waitForFunction(
      (sel) => [...document.querySelectorAll(sel)].every((s) => !/Loading/.test(s.textContent ?? "")),
      FIGURE,
      { timeout: 15_000 },
    )
    .catch(() => console.warn(`${p}: a Widget is still loading; is the backend up?`));
}

/** Room left around a figure in its crop, in CSS pixels, so its text does not touch the edge. */
const MARGIN = 24;

const browser = await chromium.launch();
try {
  for (const theme of themes) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: values.mobile ? 3 : 1 });
    // The theme script reads localStorage before the first paint, so set it before any page script runs.
    await context.addInitScript(
      ([key, value]) => localStorage.setItem(key, value),
      [STORAGE_KEY, theme] as const,
    );
    const page = await context.newPage();
    const save = (dir: string, name: string) => {
      const file = path.join(dir, `${name}.${theme}.${size}.png`);
      console.log(path.relative(process.cwd(), file));
      return file;
    };
    for (const p of paths) {
      await open(page, p);
      const pageName = p === "/" ? "home" : p.replace(/^\/|\/$/g, "").replaceAll("/", "_");
      if (values["full-page"]) {
        mkdirSync(values.out, { recursive: true });
        await page.screenshot({ path: save(values.out, pageName), fullPage: true, animations: "disabled" });
        continue;
      }
      const dir = path.join(values.out, pageName);
      mkdirSync(dir, { recursive: true });
      await page.screenshot({ path: save(dir, "01-top"), animations: "disabled" });
      const figures = page.locator(FIGURE);
      const count = await figures.count();
      for (let i = 0; i < count; i++) {
        const figure = figures.nth(i);
        const title = (await figure.getAttribute("aria-label")) ?? "figure";
        const name = `${String(i + 2).padStart(2, "0")}-${slugify(title)}`;
        await figure.scrollIntoViewIfNeeded();
        const box = await figure.boundingBox();
        if (!box) continue;
        // Page coordinates, so the clip works on the full page even for a figure taller than the viewport.
        const scrollY = await page.evaluate(() => window.scrollY);
        const x = Math.max(0, box.x - MARGIN);
        const y = Math.max(0, box.y + scrollY - MARGIN);
        const clip = { x, y, width: Math.min(viewport.width - x, box.width + 2 * MARGIN), height: box.height + 2 * MARGIN };
        await page.screenshot({ path: save(dir, name), clip, fullPage: true, animations: "disabled" });
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}
