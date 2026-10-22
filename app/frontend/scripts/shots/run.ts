/**
 * Curated shots of the Explore pages' features in action (a hover card, a bar's list, Compare, a Loss), with
 * Playwright's Chromium against a running server. Each page's shots are a list in its own file next to this one
 * (`openers.ts`, `opener-split.ts`, `follow.ts`); `screenshot.ts` is the other half, the top of every page and its Widgets.
 *
 *   bun run shots                         every page's shots
 *   bun run shots openers follow          only these pages
 *   bun run shots "follow?pool=answers&opener=slate&view=path" "opener-split?compare=fuzzy&fit=1"
 *                                         one shot of each exact URL: the whole page, or the window under Full screen
 *   bun run shots --theme nord --mobile   another theme, phone width
 *   bun run shots --theme all             in all ten themes
 *
 * Shots go to <out>/<page>/<NN>-<name>.<theme>.<width>.png, e.g. screenshots/shots/openers/03-bar-list.nord.1440.png
 * (a URL with a query goes to a folder named after it, its `?`, `&` and `=` turned to `_`: screenshots/shots/follow_view_path/01-page.nord.1440.png).
 * Options: --url (default http://localhost:3000), --out (default screenshots/shots/), --theme <id|all>, --width,
 * --height, --mobile (390x844). Start the site first (`just web`); the pages need the backend for their data.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { chromium, type Page } from "playwright";
import { DEFAULT_THEME, STORAGE_KEY } from "../../src/lib/theme/theme-script";
import { THEMES } from "../../src/lib/theme/themes";
import { type Shot, wholePage, withContext } from "./lib";
import follow from "./follow";
import openerSplit from "./opener-split";
import openers from "./openers";

/** Each curated page by its name on the command line (and its folder of shots). */
const PAGES: Record<string, Shot[]> = { openers, "opener-split": openerSplit, follow };

const root = path.resolve(import.meta.dir, "../..");

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: {
    url: { type: "string", default: "http://localhost:3000" },
    out: { type: "string", default: path.join(root, "screenshots", "shots") },
    theme: { type: "string", default: DEFAULT_THEME },
    width: { type: "string", default: "1440" },
    height: { type: "string", default: "900" },
    mobile: { type: "boolean", default: false },
  },
});

const ids: string[] = THEMES.map((t) => t.id);
const themes = values.theme === "all" ? ids : [values.theme];
for (const theme of themes) {
  if (!ids.includes(theme)) throw new Error(`Unknown theme "${theme}". Use one of: all, ${ids.join(", ")}.`);
}

/**
 * What to shoot: a page name runs that page's curated shots; a name with a query (`follow?view=path`) is one shot of
 * exactly that URL, in a folder named after it.
 */
type Run = { folder: string; shots: Shot[] };
const runs: Run[] = (positionals.length ? positionals : Object.keys(PAGES)).map((arg) => {
  const [name, query] = arg.replace(/^\//, "").split("?", 2);
  if (!PAGES[name]) throw new Error(`No shots for "${name}". Use some of: ${Object.keys(PAGES).join(", ")}.`);
  if (query === undefined) return { folder: name, shots: PAGES[name] };
  return { folder: `${name}_${query.replace(/[?&=]+/g, "_")}`, shots: [{ name: "page", path: `/${name}?${query}`, crop: wholePage }] };
});
const viewport = values.mobile ? { width: 390, height: 844 } : { width: Number(values.width), height: Number(values.height) };
const size = values.mobile ? "mobile" : `${viewport.width}`;

/** Room left around a crop, in CSS pixels, so its text does not touch the edge. */
const MARGIN = 24;

/** Load a page and wait until it is settled: network quiet, fonts in, nothing still saying "Loading…". */
async function open(page: Page, p: string) {
  await page.goto(new URL(p, values.url).href, { waitUntil: "networkidle" });
  // Hide the dev server's Next.js badge, which sits over the page.
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.evaluate(() => document.fonts.ready);
  await page
    .waitForFunction(() => !/Loading|Splitting/.test(document.querySelector("main")?.textContent ?? ""), undefined, { timeout: 15_000 })
    .catch(() => console.warn(`${p}: still loading; is the backend up?`));
}

/** Take one shot: open, act, then crop (the viewport when the crop is null). */
async function shoot(page: Page, shot: Shot, file: string) {
  await open(page, shot.path);
  await shot.act?.(page);
  let box = await shot.crop(page);
  // Back at the top, a sticky bar (the Follow page's Guess strip) sits in its place instead of over the crop.
  // Not after a hover or click: scrolling would move the pointer off what it opened.
  if (!shot.act) await page.evaluate(() => window.scrollTo(0, 0));
  if (!box) return page.screenshot({ path: file, animations: "disabled" });
  box = await withContext(page, box);
  const x = Math.max(0, box.x - MARGIN);
  const y = Math.max(0, box.y - MARGIN);
  const clip = { x, y, width: Math.min(viewport.width - x, box.width + 2 * MARGIN), height: box.height + 2 * MARGIN };
  // The margin is blank page background, not the cut-off edges of the neighbours (a heading above, a legend below).
  // A huge shadow around the box paints everything outside it; no pointer events, so an open hover card stays open.
  await page.evaluate((b) => {
    const veil = document.createElement("div");
    veil.style.cssText = `position:absolute;left:${b.x}px;top:${b.y}px;width:${b.width}px;height:${b.height}px;pointer-events:none;z-index:2147483647;box-shadow:0 0 0 100000px ${getComputedStyle(document.body).backgroundColor}`;
    document.body.append(veil);
  }, box);
  return page.screenshot({ path: file, clip, fullPage: true, animations: "disabled" });
}

const browser = await chromium.launch();
try {
  for (const theme of themes) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: values.mobile ? 3 : 1 });
    // The theme script reads localStorage before the first paint, so set it before any page script runs.
    await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, theme] as const);
    const page = await context.newPage();
    for (const run of runs) {
      const dir = path.join(values.out, run.folder);
      mkdirSync(dir, { recursive: true });
      for (const [i, shot] of run.shots.entries()) {
        const file = path.join(dir, `${String(i + 1).padStart(2, "0")}-${shot.name}.${theme}.${size}.png`);
        try {
          await shoot(page, shot, file);
          console.log(path.relative(process.cwd(), file));
        } catch (e) {
          console.warn(`${shot.path} (${shot.name}): ${(e as Error).message.split("\n")[0]}`);
        } finally {
          await page.mouse.move(0, 0); // let go of any hover before the next shot
        }
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}
