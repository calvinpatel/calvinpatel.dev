// The neuron layer's brightness cap (DESIGN.md, Color: Contrast, The neuron
// layer behind text). Behind every piece of text over the canvas, the layer's
// brightest pixel stays at or under --canvas-cap-luminance. NeuronLayer.astro's
// script measures the text's boxes and draws what these return.
//
//   - A zone is one text box. Coverage is 1 inside a zone grown by `pad`, and
//     falls smoothly to 0 over the next `feather`, so no zone has an edge.
//   - Inside a zone the layer is dimmed (the veils), so that one cell's rest
//     plus its signal lands just under the cap with its color intact.
//   - Then every channel is held at or under one gray (the clamp). That is
//     the guarantee: it holds whatever was drawn, overlaps included.
//
// No DOM and no Astro imports, so Node can run tests/neuron-zones.test.ts
// against it directly.

import type { Box } from './brain-nav.ts';

/** The zones' fixed values, in CSS px. */
export const ZONE = {
  // How far past a text box the full dimming reaches. The mask is drawn at
  // 1/scale of the canvas and smoothed back up, and a smoothed pixel inside a
  // box mixes mask pixels up to two away on each axis (11.3px on the
  // diagonal), so the pad has to be more than that.
  pad: 12,
  feather: 32, // then the dimming fades out over this much more
  scale: 4, // CSS px per mask pixel
  margin: 2, // mask pixels past each edge of the canvas, so smoothing never meets the mask's own edge
  rounding: 1, // gray levels held back, so one rounding step in a browser's blending can't break the cap
  brain: 24, // how far past the brain's box its halo still hides the layer
} as const;

/** One sRGB channel, 0 to 255, as linear light. */
function linear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** The relative luminance (WCAG) of an sRGB color, channels 0 to 255. */
export function luminance(r: number, g: number, b: number): number {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/**
 * The gray every channel is held under inside a zone, 0 to 255: the brightest
 * gray whose luminance is at or under the cap less what the brain adds over
 * the canvas, less `ZONE.rounding`. A pixel whose channels are all at or
 * under it can't be brighter than it, so the cap counts every overlap.
 */
export function capGray(cap: number, brainShare: number): number {
  let gray = 0;
  while (gray < 255 && luminance(gray + 1, gray + 1, gray + 1) <= cap - brainShare) gray++;
  return Math.max(0, gray - ZONE.rounding);
}

/**
 * How far the layer is dimmed inside a zone: the cap's gray is split evenly.
 * The brightest resting cell (`restMax`, its opacity) is dimmed to half of
 * it, and a signal at full strength to the other half.
 */
export function veils(gray: number, restMax: number): { rest: number; signal: number } {
  const half = gray / 2 / 255;
  return { rest: Math.min(1, half / restMax), signal: half };
}

/** How far a point is from a box, in px: 0 inside it. */
function distanceTo(box: Box, x: number, y: number): number {
  const dx = Math.max(box.left - x, 0, x - box.right);
  const dy = Math.max(box.top - y, 0, y - box.bottom);
  return Math.hypot(dx, dy);
}

/** How fully a point `distance` px from a zone is dimmed by it, 0 to 1. */
function dimmedAt(distance: number, pad: number, feather: number): number {
  const t = Math.min(1, Math.max(0, 1 - (distance - pad) / feather));
  return t * t * (3 - 2 * t);
}

/** How fully a point is dimmed, 0 to 1: 1 within `pad` of any zone, easing to 0 over `feather`. */
export function coverage(zones: readonly Box[], x: number, y: number, pad = ZONE.pad, feather = ZONE.feather): number {
  let nearest = Infinity;
  for (const zone of zones) nearest = Math.min(nearest, distanceTo(zone, x, y));
  return dimmedAt(nearest, pad, feather);
}

/** The coverage of a whole canvas as a small mask: one alpha per mask pixel, row by row. */
export interface Mask {
  columns: number;
  rows: number;
  alpha: Uint8ClampedArray; // 255 where the dimming is full
}

/**
 * The mask for a canvas `width` by `height` px. It is `ZONE.scale` times
 * smaller and `ZONE.margin` mask pixels larger on every side, so it is drawn
 * from -margin × scale at exactly `scale` times its size. Alpha is 255 only
 * where coverage is fully 1, and rounds down everywhere else.
 */
export function coverageMask(zones: readonly Box[], width: number, height: number): Mask {
  const { scale, margin } = ZONE;
  const columns = Math.ceil(width / scale) + 2 * margin;
  const rows = Math.ceil(height / scale) + 2 * margin;
  const alpha = new Uint8ClampedArray(columns * rows);
  // Only the mask pixels near a zone are worked out; the rest stay 0. A
  // pixel's coverage is the most any one zone dims it, so each zone only
  // needs its own distance.
  const reach = ZONE.pad + ZONE.feather;
  for (const zone of zones) {
    const c0 = Math.max(0, Math.floor((zone.left - reach) / scale) + margin);
    const c1 = Math.min(columns - 1, Math.ceil((zone.right + reach) / scale) + margin);
    const r0 = Math.max(0, Math.floor((zone.top - reach) / scale) + margin);
    const r1 = Math.min(rows - 1, Math.ceil((zone.bottom + reach) / scale) + margin);
    for (let row = r0; row <= r1; row++) {
      for (let column = c0; column <= c1; column++) {
        const i = row * columns + column;
        if (alpha[i] === 255) continue;
        const x = (column - margin + 0.5) * scale;
        const y = (row - margin + 0.5) * scale;
        const c = dimmedAt(distanceTo(zone, x, y), ZONE.pad, ZONE.feather);
        alpha[i] = Math.max(alpha[i], c >= 1 ? 255 : Math.floor(c * 255));
      }
    }
  }
  return { columns, rows, alpha };
}

/**
 * How dimmed a soma at (x, y) is, 0 to 1: the text zones' coverage there.
 * Null when it can't be seen at all: off the canvas, or behind the brain.
 * `brain` is the brain's box, if there is one.
 */
export function somaDimming(
  zones: readonly Box[],
  brain: Box | null,
  width: number,
  height: number,
  x: number,
  y: number,
): number | null {
  if (x < 0 || x > width || y < 0 || y > height) return null;
  if (brain && distanceTo(brain, x, y) < ZONE.brain) return null;
  return coverage(zones, x, y);
}

/**
 * Whether a soma at (x, y) shows: on the canvas, clear of every text zone's
 * dimming, and not behind the brain.
 */
export function somaShows(
  zones: readonly Box[],
  brain: Box | null,
  width: number,
  height: number,
  x: number,
  y: number,
): boolean {
  return somaDimming(zones, brain, width, height, x, y) === 0;
}

/**
 * Which cell fires on its own, so the firing can be seen. `dimming` holds
 * each cell's somaDimming, or null for a cell that can't fire now.
 *
 *   - Where any soma shows undimmed, one of those, picked by `random`.
 *   - Where none does, as on a narrow phone, the least dimmed soma.
 *   - -1 when no cell can fire.
 */
export function pickToFire(dimming: readonly (number | null)[], random: () => number): number {
  const clear = dimming.flatMap((value, index) => (value === 0 ? [index] : []));
  if (clear.length > 0) return clear[Math.floor(random() * clear.length)];
  let best = -1;
  dimming.forEach((value, index) => {
    if (value !== null && (best < 0 || value < dimming[best]!)) best = index;
  });
  return best;
}

/** Whether two lists of zones are the same boxes, to the pixel. */
export function sameZones(a: readonly Box[], b: readonly Box[]): boolean {
  const same = (p: Box, q: Box) =>
    Math.round(p.left) === Math.round(q.left) &&
    Math.round(p.top) === Math.round(q.top) &&
    Math.round(p.right) === Math.round(q.right) &&
    Math.round(p.bottom) === Math.round(q.bottom);
  return a.length === b.length && a.every((box, i) => same(box, b[i]));
}
