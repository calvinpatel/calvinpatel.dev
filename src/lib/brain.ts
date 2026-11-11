// The hero brain's geometry (DESIGN.md, Drawings: Brain): a left hemisphere in
// lateral view, frontal pole on the left, whose five lobes are the navigation.
// Brain.astro draws what buildBrain() returns, at build time.
//
//   - Ported from the approved spike, docs/spikes/brain-navigation.html, and
//     drawn with the same seed (11). Every curve is a Catmull-Rom spline
//     through the control points below, sampled into short straight segments.
//   - The seeded generator is drawn from in a fixed order: the outline's
//     notches, the cerebellum's, the sulci, the folia, then each lobe's nuclei
//     and cells in navigation order, the stem's nuclei, and the callouts.
//     Changing that order, or the number of draws anywhere, changes the brain.
//   - The four cerebral lobes tile the outline. Their borders are rebuilt from
//     the outline's notched points, so neighbors share every border point.
//   - Coordinates are the viewBox's units. Brain.astro draws the figure
//     smaller than its coordinates, so a unit is less than a px on screen.
//
// The numbers below are the spike's. They are the drawing's own measurements,
// like an axon divider's path data, so they live here rather than in
// tokens.css. Values a state changes, and every duration, are --brain-*
// tokens.
//
// No DOM and no Astro imports, so Node can run tests/brain.test.ts against it
// directly.

import { mulberry32 } from './raster.ts';

export type Vec = readonly [number, number];
type Random = () => number;

/** The figure's viewBox. */
export const VIEW = { x: -20, y: -12, width: 720, height: 488 } as const;

export type LobeId = 'frontal' | 'occipital' | 'temporal' | 'cerebellum' | 'parietal';
export type SectionId = 'about' | 'projects' | 'experience' | 'skills' | 'contact';

/**
 * The lobes in navigation order, which is also keyboard order. A callout runs
 * from `from`, inside the lobe, to `to`, where its label's shelf starts. The
 * label's text sits on the `side` away from the brain, and hangs under the
 * shelf where `below` is set.
 *
 * The temporal callout ends lower and further right than the spike's
 * (168, 374): from there its label reached the hero sentences in windows 780
 * to 860px wide.
 */
export const LOBES = [
  { id: 'frontal', section: 'about', from: [150, 150], to: [64, 28], side: 'left', below: false },
  { id: 'occipital', section: 'projects', from: [546, 196], to: [604, 34], side: 'right', below: false },
  { id: 'temporal', section: 'experience', from: [300, 300], to: [236, 440], side: 'left', below: false },
  { id: 'cerebellum', section: 'skills', from: [522, 346], to: [596, 428], side: 'right', below: true },
  { id: 'parietal', section: 'contact', from: [394, 112], to: [338, -8], side: 'left', below: false },
] as const satisfies readonly {
  id: LobeId;
  section: SectionId;
  from: Vec;
  to: Vec;
  side: 'left' | 'right';
  below: boolean;
}[];

/**
 * The drawing's fixed values: stroke widths and blurs in viewBox units unless
 * marked px, and opacities. Brain.astro hands them to its styles.
 */
export const LOOK = {
  tissue: { cx: 0.5, cy: 0.42, r: 0.75 }, // each lobe's radial fill, across its own box
  inner: { stroke: 18, opacity: 0.75, blur: 5 }, // shading just inside a lobe's outer edge
  groove: { stroke: 2.2, opacity: 0.7, blur: 0.8 }, // sulci and folia
  fissure: { central: 3.4, sylvian: 5.5, opacity: 0.9 },
  border: { stroke: 1, opacity: 0.2, dash: '3 5' }, // lobe borders where no sulcus runs
  nuclei: [0.18, 0.32, 0.48], // by depth band, surface inward
  breathe: 0.7, // how far the second group of nuclei fades
  rim: { stroke: 1.4, y1: 40, y2: 470, stops: [[0, 0.7], [0.6, 0.32], [1, 0.14]] }, // brightest on top
  backlight: { blur: 30 },
  stem: { fill: 0.8, stroke: 1, opacity: 0.22, fibres: 'M402 344Q410 396 408 456M418 342Q426 396 418 454' },
  cell: {
    thick: 0.8,
    thin: 0.45,
    axon: 0.35,
    axonDim: 0.55, // the axon's opacity beside its dendrites'
    nucleus: { rest: 0.35, lit: 0.5 }, // opacity = rest + lit × the cell's brightness
    pulse: 1.6,
    pulseDash: 0.16, // of the path's length
    glow: 0.6, // the soma's flash at its start
    peak: 0.9, // how far a firing cell brightens toward full
  },
  callout: {
    opacity: 0.85,
    twig: 0.7,
    dot: 0.9,
    bouton: 2.8, // px radius: the dot inside the lobe
    tip: 1.8, // px radius: the dot on the shelf
    flash: 6, // px radius of the tip's flash
    flashOpacity: 0.55,
    flashGrow: [0.5, 1.7], // the flash's scale, start to end
    pulse: 2.4, // px
    pulseDash: 0.07, // of the callout's length
    twigsAt: 0.3, // the twigs appear this far through the pulse's run
  },
  shelf: 0.55,
  label: {
    grow: 0.94, // a label's text starts at this scale
    wrap: '9.5em', // the widest the label under the brain lets its second line run: two even lines
  },
} as const;

/** How far each group of nuclei drifts, end to end, in viewBox units. */
export const DRIFT = {
  a: { from: [-2.6, 1.2], to: [2.2, -1.6] },
  b: { from: [1.8, 2], to: [-2.2, -2.4] },
  phase: 12, // each band starts up to this many seconds into its drift
} as const;

// --- Control points -----------------------------------------------------------

const N = 10; // curve samples between control points

const S0: Vec = [214, 258]; // where the Sylvian fissure meets the surface
const C0: Vec = [318, 47]; // the central sulcus
const PO: Vec = [492, 88]; // the parieto-occipital line
const P0: Vec = [530, 286]; // the pre-occipital point
const J1: Vec = [280, 236];
const SE: Vec = [424, 190];
const J3: Vec = [494, 206];

// prettier-ignore
const OUTLINE: Vec[] = [S0, [180, 268], [140, 270], [104, 262], [80, 246], [68, 218], [70, 186], [84, 150], [112, 114], [154, 84],
  [206, 64], [262, 52], C0, [380, 48], [438, 62], PO, [528, 116], [556, 154], [574, 200], [580, 232], [572, 258], [548, 276], P0,
  [476, 302], [412, 318], [348, 326], [290, 326], [246, 316], [214, 298], [204, 282]];
const SYLVIAN: Vec[] = [S0, [248, 246], J1, [330, 224], [382, 210], SE];
const CENTRAL: Vec[] = [C0, [308, 86], [302, 126], [294, 166], [288, 204], J1];
const PARIETO_TEMPORAL: Vec[] = [SE, [458, 200], J3];
const PARIETO_OCCIPITAL: Vec[] = [PO, [494, 148], J3, [500, 250], P0];
// prettier-ignore
const CEREBELLUM: Vec[] = [[440, 320], [486, 310], [534, 296], [566, 284], [588, 300], [594, 334], [572, 370], [530, 390], [482, 394], [446, 382], [428, 358], [428, 336]];
// prettier-ignore
const STEM: Vec[] = [[392, 322], [426, 326], [438, 350], [432, 388], [424, 430], [420, 460], [402, 462], [398, 428], [390, 390], [380, 354]];
// prettier-ignore
const SULCI: Vec[][] = [
  [[104, 150], [150, 120], [204, 100], [262, 88]], [[96, 214], [146, 196], [204, 184], [264, 176]],
  [[292, 58], [286, 104], [280, 150], [274, 200]], [[340, 54], [332, 98], [326, 140], [318, 184], [308, 216]],
  [[336, 138], [384, 128], [432, 132], [476, 150]], [[240, 284], [300, 272], [360, 258], [420, 240], [472, 232]],
  [[256, 312], [322, 304], [392, 292], [452, 280]], [[514, 168], [540, 200], [560, 236]],
  [[130, 240], [172, 226]], [[178, 148], [196, 176]], [[230, 118], [240, 150]], [[360, 80], [382, 102]],
  [[440, 90], [452, 114]], [[332, 300], [346, 318]], [[400, 160], [414, 186]],
];

// The outline's control points where a lobe border meets the surface.
const AT = { sylvian: 0, central: 12, parietoOccipital: 15, preOccipital: 22 } as const;

const NUCLEI_DENSITY = { cerebrum: 0.013, cerebellum: 0.034, stem: 0.016 } as const; // per square unit
const NUCLEUS_RADIUS = { min: 0.55, range: 0.65 } as const;
const BAND_DEPTH = [9, 26] as const; // a nucleus's depth band, by its distance from the surface
const CELL_AREA = { cerebrum: 3000, cerebellum: 1500 } as const; // square units per cell
const CELL_GAP = { cerebrum: 26, cerebellum: 17, edge: 7 } as const; // between somas, and from the lobe's edge
const PURKINJE_FAN: Vec = [512, 345]; // Purkinje dendrites fan away from here, toward the cerebellar surface
const GFP_SHARE = 0.6;

// --- Curves and polygons ------------------------------------------------------

const TURN = 6.283;

/** A uniform Catmull-Rom spline through `points`, N samples per segment. */
export function catmull(points: readonly Vec[], closed = false): Vec[] {
  const last = points.length - 1;
  const P: Vec[] = closed
    ? [points[last], ...points, points[0], points[1]]
    : [
        [2 * points[0][0] - points[1][0], 2 * points[0][1] - points[1][1]],
        ...points,
        [2 * points[last][0] - points[last - 1][0], 2 * points[last][1] - points[last - 1][1]],
      ];
  const out: Vec[] = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    for (let s = 0; s < N; s++) {
      const t = s / N;
      const t2 = t * t;
      const t3 = t2 * t;
      const at = (k: 0 | 1) =>
        0.5 *
        (2 * p1[k] +
          (-p0[k] + p2[k]) * t +
          (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 +
          (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      out.push([at(0), at(1)]);
    }
  }
  if (!closed) out.push([P[P.length - 2][0], P[P.length - 2][1]]);
  return out;
}

const distance = (a: Vec, b: Vec) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** The distance along a polyline to each of its points. */
function arcLength(points: readonly Vec[]): number[] {
  const s = [0];
  for (let i = 1; i < points.length; i++) s.push(s[i - 1] + distance(points[i - 1], points[i]));
  return s;
}

/** A polyline's length. */
export function lengthOf(points: readonly Vec[]): number {
  return arcLength(points).at(-1)!;
}

/** Whether a point is inside a polygon (even-odd). */
export function inside(point: Vec, polygon: readonly Vec[]): boolean {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** The closest point on a polygon's edge, and how far away it is. */
export function nearest(point: Vec, polygon: readonly Vec[]): { point: Vec; distance: number } {
  let best: Vec = polygon[0];
  let bestDistance = Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    const t = Math.min(1, Math.max(0, ((point[0] - a[0]) * ex + (point[1] - a[1]) * ey) / (ex * ex + ey * ey || 1)));
    const q: Vec = [a[0] + ex * t, a[1] + ey * t];
    const d = distance(q, point);
    if (d < bestDistance) {
      bestDistance = d;
      best = q;
    }
  }
  return { point: best, distance: bestDistance };
}

/** A polygon's area. */
export function areaOf(polygon: readonly Vec[]): number {
  let sum = 0;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    sum += (polygon[j][0] + polygon[i][0]) * (polygon[j][1] - polygon[i][1]);
  }
  return Math.abs(sum / 2);
}

interface Notches {
  fixed?: { index: number; depth: number; width: number }[]; // at these samples, always
  gap: Vec; // between random notches, along the outline
  depth: Vec;
  width: Vec;
  drift: number; // a slow wander in and out
  skip?: Vec[]; // sample ranges that stay smooth
}

/**
 * A closed outline as smooth gyral curves broken by notches where sulci reach
 * the surface, at uneven spacing and depth. The fixed notches sit where the
 * lobe borders meet the surface.
 */
function sculpt(samples: readonly Vec[], rng: Random, o: Notches): Vec[] {
  const n = samples.length;
  const s = arcLength(samples);
  const total = s[n - 1] + distance(samples[n - 1], samples[0]);
  const top = samples.reduce((best, p, i) => (p[1] < samples[best][1] ? i : best), 0);
  const normalAt = (i: number): Vec => {
    const a = samples[(i - 1 + n) % n];
    const b = samples[(i + 1) % n];
    const length = distance(a, b) || 1;
    return [(b[1] - a[1]) / length, -(b[0] - a[0]) / length];
  };
  const flip = normalAt(top)[1] > 0 ? -1 : 1; // so a notch always cuts inward
  const notches = (o.fixed ?? []).map((f) => ({ s: s[f.index], depth: f.depth, width: f.width }));
  const apart = (a: number, b: number) => {
    const d = Math.abs(a - b);
    return Math.min(d, total - d);
  };
  for (let pos = rng() * o.gap[0]; pos < total; pos += o.gap[0] + rng() * (o.gap[1] - o.gap[0])) {
    if (notches.some((notch) => apart(notch.s, pos) < o.gap[0] * 0.8)) continue;
    if ((o.skip ?? []).some(([a, b]) => pos >= s[a] && pos <= s[b])) continue;
    notches.push({
      s: pos,
      depth: o.depth[0] + rng() * (o.depth[1] - o.depth[0]),
      width: o.width[0] + rng() * (o.width[1] - o.width[0]),
    });
  }
  const p1 = rng() * TURN;
  const p2 = rng() * TURN;
  return samples.map((p, i) => {
    let off = o.drift * (Math.sin((s[i] / 97) * TURN + p1) + 0.6 * Math.sin((s[i] / 61) * TURN + p2));
    for (const notch of notches) {
      const x = apart(s[i], notch.s) / notch.width;
      if (x < 1) off -= notch.depth * Math.pow(1 - x, 1.7);
    }
    const [nx, ny] = normalAt(i);
    return [p[0] + flip * nx * off, p[1] + flip * ny * off];
  });
}

/** A sulcus that wavers: a few sines with random wavelengths, plus jitter. */
function wobble(points: readonly Vec[], rng: Random): Vec[] {
  const s = arcLength(points);
  const n = points.length;
  const waves = [0, 1, 2].map(() => ({ l: 12 + rng() * 20, p: rng() * TURN, a: 0.3 + rng() * 0.8 }));
  return points.map((p, i) => {
    if (i === 0 || i === n - 1) return p;
    const a = points[i - 1];
    const b = points[i + 1];
    const length = distance(a, b) || 1;
    const off = waves.reduce((t, w) => t + w.a * Math.sin((s[i] / w.l) * TURN + w.p), 0) + (rng() - 0.5) * 0.2;
    return [p[0] + (-(b[1] - a[1]) / length) * off, p[1] + ((b[0] - a[0]) / length) * off];
  });
}

/** A curve's samples between two of its control points; an open curve can run backward. */
function span(samples: readonly Vec[], from: number, to: number, closed = false): Vec[] {
  const out: Vec[] = [];
  const start = from * N;
  let end = to * N;
  if (closed) {
    if (end < start) end += samples.length;
    for (let k = start; k <= end; k++) out.push(samples[k % samples.length]);
  } else if (end >= start) {
    for (let k = start; k <= end; k++) out.push(samples[k]);
  } else {
    for (let k = start; k >= end; k--) out.push(samples[k]);
  }
  return out;
}

/** Spans joined end to end into one closed polygon. */
function join(...parts: Vec[][]): Vec[] {
  const out: Vec[] = [];
  for (const part of parts) out.push(...(out.length ? part.slice(1) : part));
  if (distance(out[0], out.at(-1)!) < 0.01) out.pop();
  return out;
}

// --- The small cells ------------------------------------------------------------

export interface Cell {
  x: number; // the soma
  y: number;
  color: 'gfp' | 'tdtomato';
  radius: number; // the soma is 1.4 of these, its nucleus 0.7, its glow 4
  thick: Vec[][]; // the apical dendrite: one polyline, from the soma out
  thin: Vec[][]; // every other dendrite
  axon: Vec[][]; // one polyline, from the soma out
}

type Arbor = Pick<Cell, 'radius' | 'thick' | 'thin' | 'axon'>;

interface Growth {
  wiggle: number;
  maxDepth: number;
  bif: number; // the chance a branch splits in two at its end
  spread?: number;
  child?: number;
}

function grow(
  rng: Random,
  out: Arbor,
  key: 'thick' | 'thin' | 'axon',
  x: number,
  y: number,
  angle: number,
  length: number,
  step: number,
  o: Growth,
  depth: number,
): void {
  const points: Vec[] = [[x, y]];
  let a = angle;
  let cx = x;
  let cy = y;
  const steps = Math.max(2, Math.round(length / step));
  for (let i = 0; i < steps; i++) {
    a += (rng() - 0.5) * o.wiggle;
    a += (angle - a) * 0.1;
    cx += Math.cos(a) * step;
    cy += Math.sin(a) * step;
    points.push([cx, cy]);
  }
  out[key].push(points);
  if (depth < o.maxDepth && rng() < o.bif) {
    const spread = o.spread! * (0.75 + rng() * 0.5);
    for (const side of [-1, 1]) {
      grow(rng, out, 'thin', cx, cy, a + (side * spread) / 2, length * o.child! * (0.75 + rng() * 0.4), step, o, depth + 1);
    }
  }
}

/** A cortical pyramidal cell: an apical dendrite, a skirt of basal ones, and an axon. */
function pyramidal(rng: Random, cx: number, cy: number, dir: number, size: number): Arbor {
  const out: Arbor = { thick: [], thin: [], axon: [], radius: size * 0.075 };
  const step = size * 0.07;
  grow(rng, out, 'thick', cx, cy, dir, size * 0.95, step, { wiggle: 0.25, maxDepth: 2, bif: 1, spread: 0.9, child: 0.42 }, 0);
  const basal = 3 + Math.floor(rng() * 2);
  for (let i = 0; i < basal; i++) {
    const a = dir + Math.PI + (i / (basal - 1) - 0.5) * 2.4 + (rng() - 0.5) * 0.3;
    grow(rng, out, 'thin', cx, cy, a, size * 0.36, step, { wiggle: 0.35, maxDepth: 1, bif: 0.8, spread: 0.8, child: 0.6 }, 0);
  }
  grow(rng, out, 'axon', cx, cy, dir + Math.PI + (rng() - 0.5) * 0.4, size * 0.65, step, { wiggle: 0.1, maxDepth: 0, bif: 0 }, 0);
  return out;
}

/** A cerebellar Purkinje cell: a short trunk into a wide fan, and an axon. */
function purkinje(rng: Random, cx: number, cy: number, dir: number, size: number): Arbor {
  const out: Arbor = { thick: [], thin: [], axon: [], radius: size * 0.08 };
  const step = size * 0.06;
  grow(rng, out, 'thick', cx, cy, dir, size * 0.2, step, { wiggle: 0.2, maxDepth: 4, bif: 1, spread: 1.15, child: 0.8 }, 0);
  grow(rng, out, 'axon', cx, cy, dir + Math.PI + (rng() - 0.5) * 0.3, size * 0.5, step, { wiggle: 0.1, maxDepth: 0, bif: 0 }, 0);
  return out;
}

const boundsOf = (points: readonly Vec[]) => {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};

function cellsFor(id: LobeId, region: readonly Vec[], surface: readonly Vec[], rng: Random): Cell[] {
  const kind = id === 'cerebellum' ? 'cerebellum' : 'cerebrum';
  const count = Math.max(3, Math.round(areaOf(region) / CELL_AREA[kind]));
  const { x0, x1, y0, y1 } = boundsOf(region);
  const centers: Vec[] = [];
  for (let tries = 0; tries < 4000 && centers.length < count; tries++) {
    const c: Vec = [x0 + rng() * (x1 - x0), y0 + rng() * (y1 - y0)];
    if (!inside(c, region) || nearest(c, region).distance < CELL_GAP.edge) continue;
    if (centers.some((other) => distance(other, c) < CELL_GAP[kind])) continue;
    centers.push(c);
  }
  return centers.map((c) => {
    let dir: number;
    if (kind === 'cerebellum') {
      dir = Math.atan2(c[1] - PURKINJE_FAN[1], c[0] - PURKINJE_FAN[0]);
    } else {
      const toward = nearest(c, surface).point; // the apical dendrite points at the cortical surface
      dir = Math.atan2(toward[1] - c[1], toward[0] - c[0]);
    }
    const size = kind === 'cerebellum' ? 32 + rng() * 6 : 32 + rng() * 10;
    const arbor = kind === 'cerebellum' ? purkinje(rng, c[0], c[1], dir, size) : pyramidal(rng, c[0], c[1], dir, size);
    const color: Cell['color'] = rng() < GFP_SHARE ? 'gfp' : 'tdtomato';
    return { x: c[0], y: c[1], color, ...arbor };
  });
}

// --- Nuclei -------------------------------------------------------------------

export interface Nucleus {
  x: number;
  y: number;
  radius: number;
  band: 0 | 1 | 2; // by depth: 0 nearest the surface
  group: 0 | 1; // which way it drifts
}

export interface Nuclei {
  dots: Nucleus[];
  delays: number[]; // seconds into its drift, for band 0 group 0, band 0 group 1, band 1 group 0, ...
}

/** The DAPI counterstain: every nucleus in the tissue, as a faint dot. */
function nucleiFor(region: readonly Vec[], surface: readonly Vec[], rng: Random, density: number): Nuclei {
  const count = Math.round(areaOf(region) * density);
  const { x0, x1, y0, y1 } = boundsOf(region);
  const dots: Nucleus[] = [];
  for (let k = 0, tries = 0; k < count && tries < count * 6; tries++) {
    const c: Vec = [x0 + rng() * (x1 - x0), y0 + rng() * (y1 - y0)];
    if (!inside(c, region)) continue;
    k++;
    const depth = nearest(c, surface).distance;
    const band = depth < BAND_DEPTH[0] ? 0 : depth < BAND_DEPTH[1] ? 1 : 2;
    const radius = NUCLEUS_RADIUS.min + rng() * NUCLEUS_RADIUS.range;
    dots.push({ x: c[0], y: c[1], radius, band, group: (k % 2) as 0 | 1 });
  }
  const delays = Array.from({ length: 6 }, () => rng() * DRIFT.phase);
  return { dots, delays };
}

// --- Callouts -------------------------------------------------------------------

export interface Callout {
  from: Vec;
  to: Vec;
  main: Vec[]; // the line, from the lobe to the label
  twigs: Vec[][]; // two short side branches near the lobe
  length: number; // of the line, in viewBox units
}

/** A callout drawn like a dendrite: a wavering branch with two short twigs near the lobe. */
function calloutFor(from: Vec, to: Vec, rng: Random): Callout {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const reach = Math.hypot(dx, dy);
  const nx = -dy / reach;
  const ny = dx / reach;
  const through: Vec[] = [from];
  for (const t of [0.3, 0.62]) {
    const sway = (rng() - 0.5) * reach * 0.14;
    through.push([from[0] + dx * t + nx * sway, from[1] + dy * t + ny * sway]);
  }
  through.push(to);
  const main = catmull(through);
  const twigs = (
    [
      [0.16, 1],
      [0.3, -1],
    ] as const
  ).map(([t, side]): Vec[] => {
    const i = Math.round(t * (main.length - 1));
    const p = main[i];
    const q = main[i + 1];
    const a = Math.atan2(q[1] - p[1], q[0] - p[0]) + side * (0.75 + rng() * 0.3);
    const length = 11 + rng() * 6;
    return [
      p,
      [p[0] + Math.cos(a) * length * 0.55, p[1] + Math.sin(a) * length * 0.55],
      [p[0] + Math.cos(a + side * 0.3) * length, p[1] + Math.sin(a + side * 0.3) * length],
    ];
  });
  return { from, to, main, twigs, length: lengthOf(main) };
}

// --- The whole brain ----------------------------------------------------------

export interface Folium {
  from: Vec;
  control: Vec;
  to: Vec;
}

export interface Lobe {
  id: LobeId;
  section: SectionId;
  region: Vec[]; // its closed outline
  nuclei: Nuclei;
  cells: Cell[];
  callout: Callout;
  label: { anchor: Vec; side: 'left' | 'right'; below: boolean };
  origin: Vec; // the point the lobe lifts away from when it is active
}

export interface Brain {
  outline: Vec[]; // the cerebrum's closed outline
  cerebellum: Vec[];
  stem: Vec[];
  stemNuclei: Nuclei;
  sulci: Vec[][]; // shallow grooves across the cerebrum
  folia: Folium[]; // the cerebellum's grooves, as quadratic curves
  fissures: { sylvian: Vec[]; central: Vec[] }; // the two deep grooves, which are also lobe borders
  borders: Vec[][]; // the lobe borders where no sulcus runs
  lobes: Lobe[]; // in navigation order
}

// Room around the brain's own bounds in the close view: its rim and the
// start of its glow. The rest of the glow spills into the page's margins.
const CLOSE_ROOM = 6;

/**
 * The part of the viewBox the brain itself takes: its outline, cerebellum,
 * and stem, with a little room. Phones show only this, since they have no
 * callouts or labels to leave room for.
 */
export function closeView(brain: Brain): { x: number; y: number; width: number; height: number } {
  const { x0, x1, y0, y1 } = boundsOf([...brain.outline, ...brain.cerebellum, ...brain.stem]);
  const tenth = (value: number) => Math.round(value * 10) / 10;
  const x = tenth(x0 - CLOSE_ROOM);
  const y = tenth(y0 - CLOSE_ROOM);
  return { x, y, width: tenth(x1 + CLOSE_ROOM - x), height: tenth(y1 + CLOSE_ROOM - y) };
}

/**
 * The shortest side of any lobe's box, in viewBox units. The phone figure
 * never shrinks below the size that draws this as wide as a tap target.
 */
export function narrowestLobe(brain: Brain): number {
  return Math.min(
    ...brain.lobes.map((lobe) => {
      const { x0, x1, y0, y1 } = boundsOf(lobe.region);
      return Math.min(x1 - x0, y1 - y0);
    }),
  );
}

/** A quadratic curve's samples, enough to box it. */
const sampleFolium = ({ from, control, to }: Folium): Vec[] =>
  Array.from({ length: 21 }, (_, i): Vec => {
    const t = i / 20;
    const at = (k: 0 | 1) => (1 - t) * (1 - t) * from[k] + 2 * (1 - t) * t * control[k] + t * t * to[k];
    return [at(0), at(1)];
  });

/**
 * The center of everything drawn inside a lobe, clipped or not: its surface,
 * its grooves, and its cells with their glows. The active lobe scales from
 * here, as the spike's did, which moves a cerebral lobe outward from the
 * middle of the brain rather than growing it in place.
 */
function liftOrigin(surface: readonly Vec[], grooves: readonly Vec[], cells: readonly Cell[]): Vec {
  const points: Vec[] = [...surface, ...grooves];
  for (const cell of cells) {
    const glow = cell.radius * 4;
    points.push([cell.x - glow, cell.y - glow], [cell.x + glow, cell.y + glow]);
    for (const line of [...cell.thick, ...cell.thin, ...cell.axon]) points.push(...line);
  }
  const { x0, x1, y0, y1 } = boundsOf(points);
  return [(x0 + x1) / 2, (y0 + y1) / 2];
}

/** The brain for a seed. The site draws seed 11. */
export function buildBrain(seed = 11): Brain {
  const rng = mulberry32(seed);
  const outline = sculpt(catmull(OUTLINE, true), rng, {
    fixed: [
      { index: AT.central * N, depth: 5.5, width: 7 },
      { index: AT.parietoOccipital * N, depth: 4.5, width: 7 },
      { index: AT.preOccipital * N, depth: 5, width: 8 },
    ],
    gap: [20, 52],
    depth: [1.2, 3.6],
    width: [4, 8],
    drift: 0.9,
    skip: [[25 * N, 29 * N + 9]], // the temporal lobe's underside stays smooth
  });
  const at = (control: number) => outline[control * N];
  // The borders start and end on the outline's moved points, so the lobes tile it.
  const sylvian = catmull([at(AT.sylvian), ...SYLVIAN.slice(1)]);
  const central = catmull([at(AT.central), ...CENTRAL.slice(1)]);
  const parietoTemporal = catmull(PARIETO_TEMPORAL);
  const parietoOccipital = catmull([at(AT.parietoOccipital), ...PARIETO_OCCIPITAL.slice(1, -1), at(AT.preOccipital)]);

  const regions: Record<LobeId, Vec[]> = {
    frontal: join(span(outline, AT.sylvian, AT.central, true), span(central, 0, 5), span(sylvian, 2, 0)),
    parietal: join(
      span(outline, AT.central, AT.parietoOccipital, true),
      span(parietoOccipital, 0, 2),
      span(parietoTemporal, 2, 0),
      span(sylvian, 5, 2),
      span(central, 5, 0),
    ),
    occipital: join(span(outline, AT.parietoOccipital, AT.preOccipital, true), span(parietoOccipital, 4, 0)),
    temporal: join(
      span(outline, AT.preOccipital, AT.sylvian, true),
      span(sylvian, 0, 5),
      span(parietoTemporal, 0, 2),
      span(parietoOccipital, 2, 4),
    ),
    cerebellum: sculpt(catmull(CEREBELLUM, true), rng, { gap: [9, 14], depth: [1, 2], width: [3, 4.5], drift: 0.5 }),
  };
  const cerebellum = regions.cerebellum;
  const stem = catmull(STEM, true);
  const sulci = SULCI.map((sulcus) => wobble(catmull(sulcus), rng));
  const folia = Array.from({ length: 8 }, (_, k): Folium => {
    const y = 300 + k * 12;
    return { from: [418, y], control: [505, y + 12 + (rng() - 0.5) * 4], to: [600, y - 8] };
  });

  // Each lobe's nuclei, then its cells, in navigation order.
  const tissue = LOBES.map((lobe) => {
    const region = regions[lobe.id];
    const cerebellar = lobe.id === 'cerebellum';
    const nuclei = nucleiFor(
      region,
      cerebellar ? cerebellum : outline,
      rng,
      cerebellar ? NUCLEI_DENSITY.cerebellum : NUCLEI_DENSITY.cerebrum,
    );
    const cells = cellsFor(lobe.id, region, outline, rng);
    return { nuclei, cells };
  });
  const stemNuclei = nucleiFor(stem, stem, rng, NUCLEI_DENSITY.stem);
  const callouts = LOBES.map((lobe) => calloutFor(lobe.from, lobe.to, rng));

  const lobes = LOBES.map((lobe, i): Lobe => {
    const cerebellar = lobe.id === 'cerebellum';
    const grooves = cerebellar ? folia.flatMap(sampleFolium) : [...sulci.flat(), ...sylvian, ...central];
    return {
      id: lobe.id,
      section: lobe.section,
      region: regions[lobe.id],
      nuclei: tissue[i].nuclei,
      cells: tissue[i].cells,
      callout: callouts[i],
      label: { anchor: lobe.to, side: lobe.side, below: lobe.below },
      origin: liftOrigin(cerebellar ? cerebellum : outline, grooves, tissue[i].cells),
    };
  });

  return {
    outline,
    cerebellum,
    stem,
    stemNuclei,
    sulci,
    folia,
    fissures: { sylvian, central },
    borders: [parietoOccipital, parietoTemporal],
    lobes,
  };
}

// --- Path data ----------------------------------------------------------------

// Path data is written to a tenth of a unit, which is under a tenth of a px on
// screen, and as steps from point to point, which are shorter to write than
// positions.

const tenths = (value: number) => Math.round(value * 10);

/** A count of tenths as the shortest number SVG reads: 5 is ".5", -12 is "-1.2". */
function write(count: number): string {
  if (count === 0) return '0';
  const text = String(Math.abs(count) / 10).replace(/^0\./, '.');
  return count < 0 ? `-${text}` : text;
}

/** Numbers side by side: a minus sign is its own separator. */
const run = (counts: number[]) =>
  counts.map((count, i) => (i > 0 && count >= 0 ? ' ' : '') + write(count)).join('');

/** A number to a tenth of a unit, as path data and attributes write it. */
export const unit = (value: number) => write(tenths(value));

/** A polyline's path data; `close` makes it a polygon. */
export function pathD(points: readonly Vec[], close = false): string {
  let x = tenths(points[0][0]);
  let y = tenths(points[0][1]);
  const steps: number[] = [];
  for (const point of points.slice(1)) {
    const nx = tenths(point[0]);
    const ny = tenths(point[1]);
    steps.push(nx - x, ny - y);
    x = nx;
    y = ny;
  }
  return `M${run([tenths(points[0][0]), tenths(points[0][1])])}${steps.length ? `l${run(steps)}` : ''}${close ? 'z' : ''}`;
}

/** Several polylines as one path. */
export const linesD = (lines: readonly (readonly Vec[])[]) => lines.map((line) => pathD(line)).join('');

/** The folia as one path of quadratic curves. */
export const foliaD = (folia: readonly Folium[]) =>
  folia
    .map(({ from, control, to }) => `M${run(from.map(tenths))}Q${run([...control, ...to].map(tenths))}`)
    .join('');

/**
 * Dots as one path: each is a zero-length line, which a round line cap draws
 * as a circle as wide as the stroke.
 */
export const dotsD = (dots: readonly { x: number; y: number }[]) =>
  dots.map((dot) => `M${run([tenths(dot.x), tenths(dot.y)])}h0`).join('');

export interface NucleiGroup {
  band: 0 | 1 | 2;
  group: 0 | 1;
  delay: number; // seconds
  sizes: { diameter: number; d: string }[]; // one path per size, smallest first
}

/**
 * A region's nuclei sorted for drawing: by depth band and drift group, then by
 * size. Radii are rounded to a tenth of a unit, so a band holds at most seven
 * sizes and each is one path.
 */
export function nucleiGroups(nuclei: Nuclei): NucleiGroup[] {
  const groups: NucleiGroup[] = [];
  for (const band of [0, 1, 2] as const) {
    for (const group of [0, 1] as const) {
      const bySize = new Map<number, Nucleus[]>();
      for (const dot of nuclei.dots) {
        if (dot.band !== band || dot.group !== group) continue;
        const size = tenths(dot.radius) * 2; // the diameter, in tenths
        bySize.set(size, [...(bySize.get(size) ?? []), dot]);
      }
      const sizes = [...bySize.entries()]
        .sort(([a], [b]) => a - b)
        .map(([size, dots]) => ({ diameter: size / 10, d: dotsD(dots) }));
      groups.push({ band, group, delay: nuclei.delays[band * 2 + group], sizes });
    }
  }
  return groups;
}
