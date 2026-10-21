import { Children, isValidElement, type ReactNode } from "react";

/**
 * A Margin note: a short aside printed in the margin of an Article, level with the text it comments on. Layout
 * is all CSS (globals.css, "Margin notes"): from the width where the Article column holds the measure and a
 * margin it floats into the margin; below that it is a small indented note in the text flow.
 *
 * Write it on one line, either at the end of the sentence or paragraph it belongs to, or on its own line right
 * after a block (rehype-margin-notes.mjs then sets it beside that block). It is a <span>, so it is valid
 * inside a paragraph; if MDX wraps the children of a multi-line note in a single <p>, that <p> is dropped.
 */
export function MarginNote({ children }: { children: ReactNode }) {
  const only = Children.toArray(children);
  const content =
    only.length === 1 && isValidElement<{ children?: ReactNode }>(only[0]) && only[0].type === "p"
      ? only[0].props.children
      : children;
  return <span className="margin-note">{content}</span>;
}
