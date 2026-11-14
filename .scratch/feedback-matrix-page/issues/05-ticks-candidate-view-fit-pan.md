# 05: a–z ticks, a Candidate view, and a grid that fits the page with drag-to-pan zoom

**What to build:** Three changes to the Feedback Matrix grid, asked for by the user after tickets 01–03:

1. **a–z ticks on both axes.** A tick at the first word of each letter, with the letter label centred on that letter's span (spans are uneven: many s-words, few x- or z-words). Ticks follow zoom and pan. When neighbouring labels would overlap, some labels are hidden; the tick lines stay.
2. **A Candidate view toggle.** A toggle switches between the Feedback view (cells coloured by Feedback Code, as now) and the Candidate view: no Feedback Code colours, columns still Candidates are blue and the rest grey (at step 0 the whole grid is blue). Blue and grey come from the theme, so they work light and dark. The legend matches the view. The view is in the URL (`view=candidates`; Feedback view is the default) and switching does not refill the whole grid image.
3. **The grid fits the page, with no scrolling.** The grid is a square whose side is the smaller of the content width and the viewport height minus the controls, so the whole grid is visible without scrolling the page. No scrollbar anywhere: not in the canvas frame, not on the page.
   - The fit / 2× / 4× / 8× buttons and the scrolling frame from ticket 02 are replaced by wheel zoom (desktop) and pinch zoom (phone), zooming around the pointer, and drag to pan when zoomed in. The view never pans past the grid's edges. Fit is the smallest zoom.
   - A Reset button (and double-click) returns to fit. Keyboard: `+` / `-` zoom, arrow keys pan, when the grid has focus.
   - Hover/tap card, row outlines, the Answer marker and the dimming layer all stay correct at every zoom and pan.
   - The URL keeps a shareable zoom and centre in place of the stepped `zoom` param.

See [the spec](../spec.md); update the spec's Solution and Implementation Decisions to match these changes.

**Blocked by:** 03

**Status:** resolved

- [x] The pure matrix-grid module gives the a–z tick positions (first index of each letter) from the Answer List, the visible ticks at a zoom/pan with overlapping labels dropped, and the zoom/pan maths (zoom around a point, clamping to the grid, pixel ↔ cell at any zoom and centre); `bun test` covers them, including letters with very few words and the grid's edges.
- [x] Ticks with a–z labels appear on the x and y axes and follow zoom and pan.
- [x] The Candidate view shows Candidates blue and non-Candidates grey from theme colours, with a matching legend; `view=candidates` in the URL; toggling does not refill the grid image.
- [x] The grid fits both the content width and the viewport height; neither the canvas nor the page scrolls (checked at phone and desktop widths).
- [x] Wheel and pinch zoom around the pointer, drag pans, the view is clamped to the grid, Reset and double-click return to fit, `+` / `-` and arrow keys work with focus.
- [x] Zoom and centre are in the URL; the old stepped `zoom` param is removed (or read once and converted).
- [x] Hover card, row outlines, Answer marker and dimming line up at every zoom and pan.
- [x] All new text is in the page text table for both languages.
- [x] `web-frontend.md`, its `INDEX.md` summary and the spec describe the ticks, the Candidate view and fit-with-pan zoom.
