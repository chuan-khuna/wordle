import { createHash } from "node:crypto";

/** Capitalised MDX tags that are prose, not Widgets: a Translation may add, drop or move them. Every other capitalised tag is a Widget. */
export const PROSE_COMPONENTS: ReadonlySet<string> = new Set(["Term", "Word", "Mark", "Letter", "MarginNote"]);

/** One Widget element: its tag and attributes (`name` to the source text of the value, `true` for a bare attribute). */
export type WidgetUse = { tag: string; props: Record<string, string> };

/** A body split into the text outside fenced code and the fenced code blocks themselves (fence lines included). */
function splitCode(source: string): { prose: string; blocks: string[] } {
  const blocks: string[] = [];
  const prose: string[] = [];
  let open: { fence: string; lines: string[] } | undefined;
  for (const line of source.split("\n")) {
    if (!open) {
      const m = /^ {0,3}(`{3,}|~{3,})/.exec(line);
      if (m) open = { fence: m[1], lines: [line] };
      else prose.push(line);
      continue;
    }
    open.lines.push(line);
    const close = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(line);
    if (close && close[1][0] === open.fence[0] && close[1].length >= open.fence.length) {
      blocks.push(open.lines.join("\n"));
      open = undefined;
    }
  }
  if (open) blocks.push(open.lines.join("\n"));
  return { prose: prose.join("\n"), blocks };
}

/** Reads one attribute value starting at `i`; returns its source text and the index after it. */
function readValue(s: string, i: number): [string, number] {
  const q = s[i];
  if (q === '"' || q === "'") {
    const end = s.indexOf(q, i + 1);
    if (end < 0) throw new Error(`unterminated string in a tag: ${s.slice(i, i + 40)}`);
    return [s.slice(i, end + 1), end + 1];
  }
  if (q === "{") {
    let depth = 0;
    let j = i;
    for (; j < s.length; j++) {
      if (s[j] === '"' || s[j] === "'" || s[j] === "`") {
        const end = s.indexOf(s[j], j + 1);
        if (end < 0) break;
        j = end;
      } else if (s[j] === "{") depth++;
      else if (s[j] === "}" && --depth === 0) return [s.slice(i, j + 1), j + 1];
    }
    throw new Error(`unterminated { in a tag: ${s.slice(i, i + 40)}`);
  }
  throw new Error(`cannot read an attribute value: ${s.slice(i, i + 40)}`);
}

/** The Widget elements of an MDX body, in order, ignoring fenced code, inline code and prose components. */
export function extractWidgets(source: string): WidgetUse[] {
  const prose = splitCode(source).prose.replace(/`[^`\n]*`/g, "");
  const out: WidgetUse[] = [];
  const open = /<([A-Z][\w.]*)/g;
  for (let m = open.exec(prose); m; m = open.exec(prose)) {
    const tag = m[1];
    let i = m.index + m[0].length;
    const props: Record<string, string> = {};
    for (;;) {
      while (/\s/.test(prose[i] ?? "")) i++;
      if (i >= prose.length) throw new Error(`unterminated <${tag}> tag`);
      if (prose[i] === ">" || (prose[i] === "/" && prose[i + 1] === ">")) break;
      if (prose[i] === "{") {
        const [v, next] = readValue(prose, i); // a spread such as {...props}
        props[v] = "true";
        i = next;
        continue;
      }
      const name = /^[\w:.-]+/.exec(prose.slice(i))?.[0];
      if (!name) throw new Error(`cannot read the attributes of <${tag}>: ${prose.slice(i, i + 40)}`);
      i += name.length;
      if (prose[i] === "=") {
        const [v, next] = readValue(prose, i + 1);
        props[name] = v;
        i = next;
      } else props[name] = "true";
    }
    open.lastIndex = i;
    if (!PROSE_COMPONENTS.has(tag)) out.push({ tag, props });
  }
  return out;
}

/** `<StepThroughGame answer="watch" id="free">`: a Widget as shown in an error, props sorted by name. */
function show({ tag, props }: WidgetUse): string {
  const attrs = Object.keys(props)
    .sort()
    .map((k) => (k.startsWith("{") || props[k] === "true" ? k : `${k}=${props[k]}`));
  return `<${[tag, ...attrs].join(" ")}>`;
}

/** The number of `##` (level two) headings outside fenced code. */
export function countHeadings(source: string): number {
  return splitCode(source).prose.split("\n").filter((l) => /^ {0,3}##(?!#)\s/.test(l)).length;
}

/** The fenced code blocks of a body, fence lines included, in order. */
export function codeBlocks(source: string): string[] {
  return splitCode(source).blocks;
}

/**
 * The Translation check. Compares the body of a Translation with its English original and throws, naming `file` and the first
 * mismatch, when the Widgets (tag, props including `id`, order), the number of `##` headings or the code blocks differ.
 * Prose components and the text inside fenced code (other than the blocks themselves) are ignored. It checks structure, not meaning.
 */
export function checkTranslation(file: string, english: string, translation: string): void {
  const en = extractWidgets(english);
  const th = extractWidgets(translation);
  const n = Math.max(en.length, th.length);
  for (let i = 0; i < n; i++) {
    const a = en[i] && show(en[i]);
    const b = th[i] && show(th[i]);
    if (a === b) continue;
    throw new Error(
      `${file}: Widget ${i + 1} differs. English has ${a ?? "no Widget here"}, the Translation has ${b ?? "no Widget here"}. ` +
        `Widgets must match the English original in tag, props and order (${en.length} in English, ${th.length} here).`,
    );
  }
  const he = countHeadings(english);
  const ht = countHeadings(translation);
  if (he !== ht) throw new Error(`${file}: the Translation has ${ht} "##" headings but the English original has ${he}.`);
  const ce = codeBlocks(english);
  const ct = codeBlocks(translation);
  for (let i = 0; i < Math.max(ce.length, ct.length); i++) {
    if (ce[i] === ct[i]) continue;
    if (ce[i] === undefined || ct[i] === undefined) {
      throw new Error(`${file}: code block ${i + 1} ${ce[i] === undefined ? "is not in" : "is missing from"} the English original (${ce.length} in English, ${ct.length} here).`);
    }
    const x = ce[i].split("\n");
    const y = ct[i].split("\n");
    const line = x.findIndex((l, j) => l !== y[j]);
    const at = line < 0 ? Math.min(x.length, y.length) : line;
    throw new Error(
      `${file}: code block ${i + 1} differs from the English original at its line ${at + 1}: English has ${JSON.stringify(x[at] ?? "(end of block)")}, the Translation has ${JSON.stringify(y[at] ?? "(end of block)")}. Code is never translated.`,
    );
  }
}

/** The git blob hash of a file's bytes, as `git hash-object <file>` prints it. */
export function blobHash(bytes: Uint8Array): string {
  return createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
}

/** A warning (never an error) when the `source` hash a Translation recorded is not the English file's current hash; null when they agree. */
export function staleWarning(file: string, englishFile: string, recorded: unknown, current: string): string | null {
  if (recorded === current) return null;
  const was = typeof recorded === "string" && recorded !== "" ? recorded.slice(0, 10) : "(none)";
  return `${file}: the English original ${englishFile} has changed since this Translation was made (source ${was}, now ${current.slice(0, 10)}). Review the Translation, then set source to ${current}.`;
}
