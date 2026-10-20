# Mark labels in prose

Status: done
Blocked by: 17

Add an MDX component, available without an import, that shows a Mark's name in prose with its tile colours: `<Mark kind="correct" />` renders "Correct" on `bg-correct text-on-correct`, and likewise `present` and `absent`. Children replace the text (`<Mark kind="present">Present letters</Mark>`). It follows the theme picker, uses the design tokens (tile radius, tight padding, mono or small caps), and reads as a label, not a button. On hover and focus it shows that Mark's definition from `GLOSSARY.md` (the Mark entry's sentence for that kind), reusing `<Term>`'s tooltip. An unknown `kind` fails the build. Check contrast of the label text in every palette. Use it in the Feedback Article, and document it in `docs/documents/web-frontend.md`.

See [spec](../spec.md).

## Comments

Built `<Mark>` (server) on the shared `TermTip`; kinds parsed from the GLOSSARY.md Mark entry; unknown kind fails the build. The palettes' `on-*` colours fail 4.5:1 for small text in 15 of 30 cases, so the label uses derived `ink-*` tokens (black or white by Mark colour), min 4.51:1. Used in the Feedback Article. See `docs/documents/web-frontend.md`.
