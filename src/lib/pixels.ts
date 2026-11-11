// Lines a drawing's parts up with pixels, so each one is equally sharp. The
// Experience raster (src/lib/raster.ts) and the Skills wiring
// (src/lib/wiring.ts) share these.
//
// A position is in px along one axis of a drawing, and the pixels are the
// drawing's own, counted from its SVG's corner. That is where a browser
// starts painting it: an SVG's contents are painted from the screen pixel
// nearest its corner, wherever the SVG falls on the page (measured in Chrome
// at device scale 1, 2, and 3). So a whole pixel in the drawing is a whole
// pixel on the screen, and correcting for the drawing's place on the page
// would move things off the pixels.
//
// Nothing moves more than half a pixel. No DOM and no Astro imports, so Node
// can run tests/pixels.test.ts against it directly.

/** The nearest pixel center, n + 0.5px from the drawing's corner. */
export function toPixelCenter(position: number): number {
  return Math.round(position - 0.5) + 0.5;
}

/** The nearest pixel edge, a whole px from the drawing's corner. */
export function toPixelEdge(position: number): number {
  return Math.round(position);
}

/**
 * The center nearest `position` that puts both edges of a dot `diameter` px
 * wide on pixel edges: a whole pixel for an even diameter, a pixel center for
 * an odd one. The dot is then the same shape on every side, at device scale
 * 1, 2, and 3.
 */
export function snapDot(position: number, diameter: number): number {
  return toPixelEdge(position - diameter / 2) + diameter / 2;
}
