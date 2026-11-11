// Lines a drawing's parts up with pixels, so each one is equally sharp. The
// Experience raster (src/lib/raster.ts) and the Skills wiring
// (src/lib/wiring.ts) share these.
//
// A position is in px along one axis of a drawing. Left alone, it moves to
// the drawing's own pixels, counted from the drawing's start. With `origin`,
// which is where the drawing starts on that axis in px from the page's edge,
// it moves to the page's pixels instead.
//
// Nothing moves more than half a pixel. No DOM and no Astro imports, so Node
// can run tests/pixels.test.ts against it directly.

/** The nearest pixel center, n + 0.5px, as a position in the drawing. */
export function toPixelCenter(position: number, origin = 0): number {
  return Math.round(origin + position - 0.5) + 0.5 - origin;
}

/** The nearest pixel edge, a whole px, as a position in the drawing. */
export function toPixelEdge(position: number, origin = 0): number {
  return Math.round(origin + position) - origin;
}

/**
 * The center nearest `position` that puts both edges of a dot `diameter` px
 * wide on pixel edges: a whole pixel for an even diameter, a pixel center for
 * an odd one. The dot is then the same shape on every side, at device scale
 * 1, 2, and 3.
 */
export function snapDot(position: number, diameter: number, origin = 0): number {
  return toPixelEdge(position - diameter / 2, origin) + diameter / 2;
}
