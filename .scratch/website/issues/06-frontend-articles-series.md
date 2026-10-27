# Articles, Series, KaTeX and glossary Terms

Status: done
Blocked by: 05

Set up the MDX pipeline (`@next/mdx`, `remark-math`, `rehype-katex`) and the content model from the spec: frontmatter, Prerequisites, backlinks, Series ordering, prev/next links, the index page and the video embed. Add `<Term>`, which reads the root `GLOSSARY.md` at build time and fails the build on an unknown term. Add one sample Article to exercise everything.

See [spec](../spec.md).

## Comments

Done. MDX via `@next/mdx` with string-named plugins (Turbopack-safe); frontmatter is parsed by `lib/content.ts` with gray-matter and `remark-frontmatter` strips it from output. `<Term>` reads the root `GLOSSARY.md` and throws on unknown terms, failing the build. Sample content is `content/*/sample-*` (placeholder for ticket 10). Details in `docs/documents/web-frontend.md`.
