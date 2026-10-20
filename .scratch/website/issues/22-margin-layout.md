# Article layout with a margin for notes

Status: done

Lay the Article body out in two columns, in the style of Tufte's books (the user's sketch):

```
| content (prose, at the measure)        | margin notes |
| display maths (at the measure)         | margin notes |
| code block / Widget (content + margin, full width)    |
```

- **Content column**: paragraphs, lists, headings, quotes and display maths, at the prose measure (68ch). Display maths stays centred over the text.
- **Margin column**: to the right of the content column, for margin notes. Add an MDX component `<MarginNote>` (no import needed) whose children are short prose (it may hold `<Term>`, `<Word>`, `<Letter>`, `<Mark>`, inline maths and links). A note sits in the margin level with the paragraph or display formula it is written in or right after (for example floated into the margin from inside the paragraph, as Tufte CSS does), in the UI sans at a smaller size in the `meta` colour, with no box. Notes never overlap each other: a later one is pushed down below an earlier one.
- **Full width**: code blocks and Widgets span the content column and the margin together.
- **Narrow screens**: when there is no room for the margin (the sidebar, the measure and a margin of about 16–18rem must fit; choose the breakpoint from the real widths), the page is one column: margin notes appear in the text flow right after the block they belong to, set off as a small indented note with a left rule, and code blocks and Widgets use the column width. No sideways page scroll at 390px.
- Widen the page container only as needed so the content column keeps its measure and the margin fits; the home page stays as it is.
- Keep the Article header, Prerequisites, backlinks and prev/next aligned with the content column.
- Add **Margin note** to the Publishing section of `GLOSSARY.md` (a short aside printed in the margin of an Article, beside the text it comments on), and use that name in code, UI and docs.
- Demonstrate it in the drafted Articles by moving two or three sentences that are already asides into `<MarginNote>`s (for example a caveat or a side remark next to a formula in Article 04 or 10), without writing new text. List which sentences moved in the ticket's Comments so the user can review them.
- Update `docs/documents/web-frontend.md` (layout, `<MarginNote>`, breakpoints).

See [spec](../spec.md).

## Comments

Done. Layout: the Article is a size container; the body is the measure + 2.5rem gap + 16rem margin (989px); a `<MarginNote>` floats into the margin (Tufte CSS) from `@container article (min-width: 989px)`, which is a window width of about 1277px with the sidebar, and is an indented note in the flow below that. A note on its own line after a paragraph, list, quote or display formula is seated beside that block by `lib/rehype-margin-notes.mjs`. Details are in `docs/documents/web-frontend.md` (Article layout and `<MarginNote>`); the term is in `GLOSSARY.md`.

Sentences moved into `<MarginNote>`s (existing text only, none written):

- Article 04 (`04-solving-introduction.mdx`), at the end of the paragraph after the Python example, written inside the paragraph: "The Solver uses the same two formulas, just for every word at once."
- Article 06 (`06-feedback-split.mdx`), on its own line right after the entropy formula (the whole former paragraph): "This formula is known in information theory as entropy. That is the only time we will use the word. We will call it Expected Information."
- Article 10 (`10-greedy-vs-optimal.mdx`), on its own line after the "19 Guesses behind" paragraph (the whole former paragraph): "One detail to keep honest: Selby's Guess List has 12,972 words, and ours has 14,855. The Answers are the same size, but the lists are not the same, so the comparison is close but not exact."
