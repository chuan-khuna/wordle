# 02: Hover a cell and zoom in

**What to build:** On the Feedback Matrix page, hovering (or tapping) a cell shows its Guess, its Answer and the Feedback as Tiles. Zoom buttons (fit, 2×, 4×, 8×) enlarge the grid inside a scrolling frame, so single cells can be picked out, including on a phone. The zoom level is kept in the URL. See [the spec](../spec.md).

**Blocked by:** 01

**Status:** resolved

- [x] The pure matrix-grid module maps a pixel to (row, column) at a zoom level and back; `bun test` covers each zoom level and the grid's edges.
- [x] Hover or tap shows the Guess, the Answer and the Feedback Tiles of the cell under the pointer, and hides when the pointer leaves the grid.
- [x] Zoom buttons fit / 2× / 4× / 8× are keyboard reachable; the `zoom` URL param sets the level; above fit the frame scrolls, the page itself never scrolls sideways.
- [x] The grid stays crisp (no smoothing) at every zoom.
- [x] `web-frontend.md` describes hover and zoom.
