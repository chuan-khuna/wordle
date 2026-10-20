# Python code blocks in Articles

Status: done
Blocked by: 21

Articles can show Python code. Fenced code blocks in MDX (```` ```python ````) are syntax-highlighted at build time (for example Shiki through `rehype-pretty-code`, with plugin options that work under Turbopack), with no client JavaScript. Highlight colours come from the theme roles as CSS variables, so code follows the theme picker, and the block uses the design tokens (mono font, hairline frame, no shadow). Support an optional title (such as a file name) and line highlighting; long lines scroll inside the block, never the page. Add a copy button if it stays small and accessible. Update `docs/documents/web-frontend.md` with how to write a code block.

See [spec](../spec.md).

## Comments

Done with `rehype-pretty-code` 0.14.5 + `shiki` 4.5.0. Inline JSON theme (`tokenColors`, colours as `var(--code-*)`) passed by option, so it works under Turbopack. Copy button via a `figure` override. Example block added to Article `02-feedback` (whole `feedback.py`, second pass highlighted). See `docs/documents/web-frontend.md`, "Code blocks".
