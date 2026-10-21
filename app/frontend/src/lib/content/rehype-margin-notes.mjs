// A <MarginNote> written on its own line, right after a paragraph, list, quote or display formula, belongs to
// that block. This plugin puts the block and its notes into one <div class="margin-row"> so CSS can set the
// note beside the block (a grid with the text column and the margin column) instead of below it. A note inside
// a paragraph is left alone: it floats from where it is written. Named by string in next.config.ts.

const BLOCKS = new Set(["p", "ul", "ol", "blockquote"]);

const isNote = (node) => node.type === "mdxJsxFlowElement" && node.name === "MarginNote";
const isRow = (node) => node.type === "element" && node.tagName === "div" && node.properties?.className?.includes("margin-row");
const isBlock = (node) =>
  node.type === "element" &&
  (BLOCKS.has(node.tagName) || node.properties?.className?.includes("katex-display")); // rehype-katex: <span class="katex-display">
const isBlank = (node) => node.type === "text" && node.value.trim() === "";

function wrap(parent) {
  const out = [];
  for (const child of parent.children) {
    if (child.children) wrap(child);
    if (!isNote(child)) {
      out.push(child);
      continue;
    }
    // Look back past whitespace for the block the note follows.
    let at = out.length - 1;
    while (at >= 0 && isBlank(out[at])) at--;
    const prev = out[at];
    if (prev && isRow(prev)) {
      prev.children.push(child);
      out.length = at + 1;
    } else if (prev && isBlock(prev)) {
      out.length = at;
      out.push({ type: "element", tagName: "div", properties: { className: ["margin-row"] }, children: [prev, child] });
    } else {
      out.push(child);
    }
  }
  parent.children = out;
}

export default function rehypeMarginNotes() {
  return (tree) => wrap(tree);
}
