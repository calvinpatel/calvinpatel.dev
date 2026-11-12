// Where the hero's neuron layer puts things (DESIGN.md, Drawings: Neuron
// layer): how many cells, which, where, how large, how deep, and the field
// of DAPI nuclei behind them. Ported from the hero layer of the approved
// spike, docs/spikes/brain-navigation.html. NeuronLayer.astro's script draws
// what these return.
//
//   - Everything comes from one seeded generator, so the same window always
//     gets the same field.
//   - A cell's depth sets how out of focus it is, how bright it rests, and
//     how far it drifts. The nearest cells are the sharpest and brightest.
//   - Nuclei are placed in bands of a fixed height, so a hero that changes
//     height keeps every nucleus it had.
//
// No DOM and no Astro imports, so Node can run tests/neuron-field.test.ts
// against it directly.

import { mulberry32 } from './raster.ts';

/** The field's fixed values. Lengths are CSS px unless they say otherwise. */
export const FIELD = {
  seed: 2026,
  count: { area: 100_000, min: 6, max: 16 }, // one cell per this many px² of hero, within these limits
  // A cell's size is min to min + vary of the hero's shorter side, which
  // counts as at least `floor` px. On a phone that makes the cells about as
  // large against the screen as the phone artboard's, which crops the desktop's.
  size: { min: 0.2, vary: 0.18, floor: 800 },
  past: 0.05, // a soma may sit this share of the hero past any edge
  apart: 0.42, // two somas keep this share of their sizes' sum apart,
  tries: 40, // if that many tries can find the room
  depth: { min: 0.25, vary: 0.75 }, // 1 is nearest
  blur: { near: 0.2, far: 1.2 }, // a Gaussian's standard deviation: near + far × (1 − depth)
  rest: { base: 0.08, depth: 0.16 }, // a resting cell's opacity: base + depth × its depth
  drift: { base: 4, depth: 10, down: 0.7, slower: 1.31 }, // how far, and the up-and-down part's share and period
  gfp: 0.6, // the share of cells in GFP; the rest are tdTomato
  pyramidal: {
    scale: 1.35, // drawn this much larger: their long apical dendrite sets their reach
    tilt: 0.5, // radians, end to end: they stay apical-up, turned by up to half this either way
  },
  nucleus: { share: 0.55, min: 1.3, rest: 0.3, depth: 0.25, lit: 0.4 }, // the DAPI dot in a soma: radius, opacity
  nuclei: {
    area: 7000, // one nucleus per this many px²
    band: 512, // the height of one band
    soft: 0.3, // the share that are large and faint
    softRadius: [2, 2.5], // each pair: the least, and how much more at most
    softAlpha: [0.05, 0.06],
    radius: [0.7, 1.4],
    alpha: [0.1, 0.22],
    squash: [0.75, 0.25], // the short axis over the long one
  },
  deviceScale: 2, // the canvas is never drawn finer than this many device px per px,
  pixels: 16_000_000, // or larger than this many device px in all (iOS's limit, about)
} as const;

/** The brightest a resting cell's line can be: the opacity of the nearest. */
export const REST_MAX = FIELD.rest.base + FIELD.rest.depth;

/** The length the cells are sized from: the hero's shorter side, or FIELD.size.floor if that is longer. */
export function sizeBasis(width: number, height: number): number {
  return Math.max(FIELD.size.floor, Math.min(width, height));
}

/** How many cells a hero of this size holds. */
export function cellCount(width: number, height: number): number {
  const { area, min, max } = FIELD.count;
  return Math.max(min, Math.min(max, Math.round((width * height) / area)));
}

/**
 * The order the cells are used in: the pyramidal cells spread evenly among
 * the others, so a small screen's few cells include both kinds.
 * `pyramidal[i]` says whether cell i is one.
 */
export function cellOrder(pyramidal: readonly boolean[]): number[] {
  const tall = pyramidal.flatMap((is, i) => (is ? [i] : []));
  const others = pyramidal.flatMap((is, i) => (is ? [] : [i]));
  if (tall.length === 0) return others;
  const every = Math.max(1, Math.floor(pyramidal.length / tall.length));
  const order: number[] = [];
  for (let i = 0; i < pyramidal.length; i++) {
    const turn = i % every === 0 && tall.length > 0;
    order.push(turn || others.length === 0 ? tall.shift()! : others.shift()!);
  }
  return order;
}

/** One placed cell. */
export interface Placement {
  cell: number; // which of the loaded cells
  mirror: boolean; // a cell used a second time is flipped left to right
  x: number; // its soma, in px from the canvas's corner
  y: number;
  size: number; // px: sets its soma, its line widths, and its spines
  reach: number; // px from its soma to its farthest point
  depth: number; // FIELD.depth: 1 is nearest
  color: 'gfp' | 'tdtomato';
  rotation: number; // radians
  period: number; // ms: one full drift, side to side
  phase: number; // radians: where in the drift it starts
}

/**
 * The cells for a hero `width` by `height` px, farthest first, which is the
 * order they are drawn in. `drift` is the range of drift periods in ms.
 */
export function placeCells(
  width: number,
  height: number,
  pyramidal: readonly boolean[],
  drift: { min: number; max: number },
  seed: number = FIELD.seed,
): Placement[] {
  if (pyramidal.length === 0) return [];
  const random = mulberry32(seed);
  const basis = sizeBasis(width, height);
  const order = cellOrder(pyramidal);
  const somewhere = (extent: number) => (random() * (1 + 2 * FIELD.past) - FIELD.past) * extent;

  const placed: Placement[] = [];
  for (let i = 0, count = cellCount(width, height); i < count; i++) {
    const cell = order[i % order.length];
    const size = basis * (FIELD.size.min + random() * FIELD.size.vary);
    let x = 0;
    let y = 0;
    let tries = 0;
    do {
      x = somewhere(width);
      y = somewhere(height);
    } while (
      ++tries < FIELD.tries &&
      placed.some((other) => Math.hypot(other.x - x, other.y - y) < (other.size + size) * FIELD.apart)
    );
    const depth = FIELD.depth.min + random() * FIELD.depth.vary;
    const color = random() < FIELD.gfp ? 'gfp' : 'tdtomato';
    const tall = pyramidal[cell];
    // Pyramidal cells stay apical-up with a small tilt. The others have no up.
    const rotation = tall ? (random() - 0.5) * FIELD.pyramidal.tilt : random() * 2 * Math.PI;
    placed.push({
      cell,
      mirror: Math.floor(i / order.length) % 2 === 1,
      x,
      y,
      size,
      reach: tall ? size * FIELD.pyramidal.scale : size,
      depth,
      color,
      rotation,
      period: drift.min + random() * (drift.max - drift.min),
      phase: random() * 2 * Math.PI,
    });
  }
  return placed.sort((a, b) => a.depth - b.depth);
}

/** How out of focus a cell is: its blur's standard deviation, in px. */
export function blurOf(depth: number): number {
  return FIELD.blur.near + FIELD.blur.far * (1 - depth);
}

/** A resting cell's opacity. */
export function restAlpha(depth: number): number {
  return FIELD.rest.base + FIELD.rest.depth * depth;
}

/** How far a cell has drifted from its place after `time` ms of drifting, in px. Nearer cells drift further. */
export function driftAt(placement: Placement, time: number): [number, number] {
  const { base, depth, down, slower } = FIELD.drift;
  const far = base + depth * placement.depth;
  const turn = (2 * Math.PI * time) / placement.period;
  return [Math.sin(turn + placement.phase) * far, Math.cos(turn / slower + placement.phase) * far * down];
}

/** One DAPI nucleus of the field: an ellipse. */
export interface FieldNucleus {
  x: number;
  y: number;
  radius: number; // its long axis
  squash: number; // its short axis over its long one
  turn: number; // radians
  alpha: number;
}

/**
 * The nuclei behind the cells, for a hero `width` px wide and at least
 * `height` px tall: whole bands, so some lie below `height`. A band's nuclei
 * depend only on the width and the band, never on the height.
 */
export function placeNuclei(width: number, height: number, seed: number = FIELD.seed): FieldNucleus[] {
  const look = FIELD.nuclei;
  const nuclei: FieldNucleus[] = [];
  for (let band = 0; band * look.band < height; band++) {
    const random = mulberry32(seed + 7919 * (band + 1));
    for (let i = 0, count = Math.round((width * look.band) / look.area); i < count; i++) {
      const x = random() * width;
      const y = (band + random()) * look.band;
      const soft = random() < look.soft;
      const [radius, more] = soft ? look.softRadius : look.radius;
      const [alpha, brighter] = soft ? look.softAlpha : look.alpha;
      nuclei.push({
        x,
        y,
        radius: radius + random() * more,
        alpha: alpha + random() * brighter,
        squash: look.squash[0] + random() * look.squash[1],
        turn: random() * Math.PI,
      });
    }
  }
  return nuclei;
}

/** How many device px the canvas draws per px: the screen's own scale, within FIELD's two limits. */
export function canvasScale(width: number, height: number, deviceScale: number): number {
  const scale = Math.min(FIELD.deviceScale, deviceScale || 1);
  const most = Math.sqrt(FIELD.pixels / Math.max(1, width * height));
  return Math.min(scale, most);
}
