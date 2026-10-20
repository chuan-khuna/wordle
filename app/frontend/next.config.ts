import createMDX from "@next/mdx";
import type { NextConfig } from "next";

// Where the FastAPI backend runs. Next proxies /api/* there, so the browser only talks to one origin.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  // The dev indicator defaults to bottom-left, on top of the sidebar's theme button.
  devIndicators: { position: "bottom-right" },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

// Shiki theme for code blocks (VS Code format; rehype-pretty-code needs `tokenColors`): a plain JSON object (so it can be handed to Turbopack) whose colours are
// CSS variables, defined per role in globals.css (--code-keyword, ...), so code follows the palette and the
// theme picker live with no client JS. Scopes are matched most-specific-first by Shiki.
const codeTheme = {
  name: "wordle-css-vars",
  type: "dark",
  colors: { "editor.foreground": "var(--code-text)", "editor.background": "transparent" },
  tokenColors: [
    { settings: { foreground: "var(--code-text)" } },
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: "var(--code-comment)", fontStyle: "italic" } },
    { scope: ["keyword", "storage", "storage.type", "storage.modifier", "keyword.operator.logical", "keyword.operator.word"], settings: { foreground: "var(--code-keyword)" } },
    { scope: ["string", "string.quoted", "punctuation.definition.string", "constant.character.escape"], settings: { foreground: "var(--code-string)" } },
    { scope: ["constant.numeric", "constant.language", "constant.other"], settings: { foreground: "var(--code-number)" } },
    { scope: ["entity.name.function", "support.function", "meta.function-call", "meta.function.decorator", "entity.name.function.decorator"], settings: { foreground: "var(--code-function)" } },
    { scope: ["entity.name.type", "entity.name.class", "support.type", "support.class", "entity.other.inherited-class", "meta.class"], settings: { foreground: "var(--code-type)" } },
    { scope: ["punctuation", "meta.brace", "keyword.operator"], settings: { foreground: "var(--code-punct)" } },
    { scope: ["variable.parameter", "variable", "meta.function-call.arguments"], settings: { foreground: "var(--code-text)" } },
  ],
};

// Plugins are named by string, with serialisable options, because Turbopack cannot be handed functions.
const withMDX = createMDX({
  options: {
    // remark-frontmatter drops the `---` block from the output; lib/content.ts reads it with gray-matter.
    remarkPlugins: ["remark-frontmatter", "remark-math"],
    rehypePlugins: [
      ["rehype-katex", { strict: "error", throwOnError: true }],
      // Build-time syntax highlighting (Shiki): ```python title="file.py" {3-5} showLineNumbers
      ["rehype-pretty-code", { theme: codeTheme, keepBackground: false, defaultLang: "text" }],
    ],
  },
});

export default withMDX(nextConfig);
