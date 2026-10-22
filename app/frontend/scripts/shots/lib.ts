/**
 * The shared parts of the curated shots (`bun run shots`): what a shot is, and the helpers the page files use to
 * set one up and to say what to crop.
 */
import type { Page } from "playwright";

/** A rectangle in page coordinates (CSS pixels from the top of the document). */
export type Box = { x: number; y: number; width: number; height: number };

/**
 * One feature of a page in action: open `path`, do `act` (hover, click), then shoot `crop` (a box in page
 * coordinates, or the viewport when it returns null).
 */
export type Shot = { name: string; path: string; act?: (page: Page) => Promise<void>; crop: (page: Page) => Promise<Box | null> };

/** The Radix card (glossary term, block head, word) that a hover or click opened. */
export const POPPER = "[data-radix-popper-content-wrapper]";

/** The page box of the first element matching `selector`, null when there is none. It does not scroll, so a hover stays put. */
export async function boxOf(page: Page, selector: string): Promise<Box | null> {
  const el = page.locator(selector).first();
  if ((await el.count()) === 0) return null;
  const box = await el.boundingBox();
  if (!box) return null;
  const scrollY = await page.evaluate(() => window.scrollY);
  return { ...box, y: box.y + scrollY };
}

/** The smallest box holding every box given (nulls skipped), at most `maxHeight` tall. */
export function union(boxes: (Box | null)[], maxHeight = Infinity): Box | null {
  const real = boxes.filter((b): b is Box => b !== null);
  if (real.length === 0) return null;
  const x = Math.min(...real.map((b) => b.x));
  const y = Math.min(...real.map((b) => b.y));
  const right = Math.max(...real.map((b) => b.x + b.width));
  const bottom = Math.max(...real.map((b) => b.y + b.height));
  return { x, y, width: right - x, height: Math.min(bottom - y, maxHeight) };
}

/**
 * `box` grown to take in, whole, the small things within `reach` px of it (a heading above, a legend below), so
 * the shot shows them for context instead of their cut-off edges. Only text, SVG and images count, at most `reach`
 * tall, and nothing fixed or sticky (a page bar is not context).
 */
export async function withContext(page: Page, box: Box, reach = 64): Promise<Box> {
  return page.evaluate(
    ({ box, reach }) => {
      const band = { left: box.x - reach, top: box.y - reach, right: box.x + box.width + reach, bottom: box.y + box.height + reach };
      const pinned = (e: Element | null): boolean => {
        for (; e; e = e.parentElement) if (/fixed|sticky/.test(getComputedStyle(e).position)) return true;
        return false;
      };
      const leaf = (e: Element) =>
        /^(svg|img|canvas|input)$/i.test(e.tagName) ||
        [...e.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim() !== "");
      let { left, top } = { left: box.x, top: box.y };
      let { right, bottom } = { right: box.x + box.width, bottom: box.y + box.height };
      for (const e of document.body.querySelectorAll("*")) {
        const svg = e.closest("svg");
        if (!leaf(e) || (svg && svg !== e)) continue; // an SVG counts whole, not its parts
        const r = e.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || r.height > reach || getComputedStyle(e).visibility === "hidden") continue;
        const x = r.left + scrollX, y = r.top + scrollY;
        const inBand = x < band.right && x + r.width > band.left && y < band.bottom && y + r.height > band.top;
        if (!inBand || pinned(e)) continue;
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x + r.width);
        bottom = Math.max(bottom, y + r.height);
      }
      left = Math.max(0, left);
      right = Math.min(document.documentElement.clientWidth, right);
      return { x: left, y: top, width: right - left, height: bottom - top };
    },
    { box, reach },
  );
}

/** The boxes of `selectors` together, at most `maxHeight` tall. */
export const around =
  (selectors: string[], maxHeight = Infinity) =>
  async (page: Page) =>
    union(await Promise.all(selectors.map((s) => boxOf(page, s))), maxHeight);

/** The card a hover or click opened, with `context` (what it was opened from, or around it), at most 600 px tall. */
export const withCard = (context: string) => around([context, POPPER], 600);

/** Rest the mouse on the middle of the first element matching `selector` (no actionability checks: SVG blocks overlap). */
export async function hover(page: Page, selector: string) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  if (!box) throw new Error(`Nothing to hover: ${selector}`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(600); // the cards open after a 150 ms rest
}

/** Hover the first element matching `selector`, then press and release the mouse there (a click that SVG overlap cannot block). */
export async function click(page: Page, selector: string) {
  await hover(page, selector);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(400);
}

/** The window, when something fixed covers it (Full screen); else the whole page. */
export async function wholePage(page: Page): Promise<Box | null> {
  const covered = await page.evaluate(() => {
    const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    for (let e = el; e; e = e.parentElement) {
      const r = e.getBoundingClientRect();
      if (getComputedStyle(e).position === "fixed" && r.width >= innerWidth && r.height >= innerHeight) return true;
    }
    return false;
  });
  if (covered) return null;
  const { width, height } = await page.evaluate(() => ({ width: innerWidth, height: document.documentElement.scrollHeight }));
  return { x: 0, y: 0, width, height };
}
