# Python code blocks in Articles

Status: ready-for-agent
Blocked by: 20

Articles can show Python code. Fenced code blocks in MDX (```` ```python ````) are syntax-highlighted at build time (for example Shiki through `rehype-pretty-code`, with plugin options that work under Turbopack), with no client JavaScript. Highlight colours come from the theme roles as CSS variables, so code follows the theme picker, and the block uses the design tokens (mono font, hairline frame, no shadow). Support an optional title (such as a file name) and line highlighting; long lines scroll inside the block, never the page. Add a copy button if it stays small and accessible. Update `docs/documents/web-frontend.md` with how to write a code block.

See [spec](../spec.md).
