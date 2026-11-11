// One neuron of the hero's neuron layer, ready to draw (DESIGN.md, Drawings:
// Neuron layer): a cell-web/1 file (docs/cell-web-v1.md) turned into points
// in px around its soma, with a line width for every stretch of dendrite, its
// spines, and what a pointer needs to find it. NeuronLayer.astro's script
// draws what these return.
//
//   - The files are simplified, with few points on a straight stretch, so
//     long stretches are cut into short ones for a signal to travel along,
//     and spines are spaced by length, not one per point.
//   - The files' radii aren't comparable from one cell to the next, so a
//     line's width comes from the tree's own shape (lineWidth).
//   - None of the ten cells has a traced axon. Axon points are left out.
//
// No DOM and no Astro imports, so Node can run tests/neuron-cell.test.ts
// against it directly.

import type { Box } from './brain-nav.ts';
import { mulberry32 } from './raster.ts';

/** A cell's fixed values. Lengths are px unless they say otherwise. */
export const SHAPE = {
  step: 8, // the longest stretch between two points, so a signal moves smoothly
  // A line's width: the spike's formula, base + gain × radius, kept between
  // min and max. The radius is `tip` (a share of the cell's size) at a tip.
  line: { tip: 0.0016, base: 0.35, gain: 0.9, min: 0.45, max: 2.6 },
  soma: { min: 2.2, max: 7, reach: 8 }, // the radius's limits, and how far past it a pointer still touches it
  spine: {
    every: 0.02, // of the cell's size: one place for a spine this often along a dendrite
    keep: 0.45, // the share of those places that grow one
    from: 0.12, // of the longest path: none nearer the soma than this
    perSize: 110, // a spine's base length is the cell's size over this,
    min: 1.1, // kept between these two
    max: 3,
    vary: [0.6, 0.8], // each spine is base × (vary[0] + up to vary[1]), plus half its dendrite's width
    stroke: 0.6,
  },
  grid: 24, // the side of one square of the pointer's lookup grid
  pad: 10, // room around a cell's bounds for its spines and its blur
} as const;

const AXON = 2;

/** The fields of a cell-web/1 file the layer draws. */
export interface CellFile {
  cellType: string;
  x: number[]; // the soma is at (0, 0) and the farthest point at distance 1
  y: number[]; // down the screen
  parent: number[]; // -1 for the soma, which is point 0
  kind: number[]; // 1 soma, 2 axon, 3 basal dendrite, 4 apical dendrite
  dist: number[]; // from the soma along the branches
}

/** Checks a fetched file is cell-web/1 and returns it. Throws if it isn't. */
export function readCell(data: unknown): CellFile {
  const file = data as Partial<CellFile> & { format?: unknown };
  if (file?.format !== 'cell-web/1') throw new Error('not a cell-web/1 file');
  const { x, y, parent, kind, dist } = file;
  for (const field of [x, y, parent, kind, dist]) {
    if (!Array.isArray(field) || field.length !== x?.length) throw new Error("a cell's arrays differ in length");
  }
  if (x!.length < 2 || parent![0] !== -1) throw new Error("a cell's first point must be its soma");
  for (let i = 1; i < parent!.length; i++) {
    if (!(parent![i] >= 0 && parent![i] < i)) throw new Error(`point ${i} comes before its parent`);
  }
  return file as CellFile;
}

/** How a cell is placed. */
export interface Shape {
  size: number; // px: the size it was placed at, which sets its soma, widths, and spines
  reach: number; // px from the soma to its farthest point: its size, or more for a cell drawn larger
  rotation: number; // radians, clockwise on screen
  mirror: boolean; // flipped left to right
  somaShare: number; // --neuron-soma
  seed: number; // for its spines
}

/** A cell in px around its soma. Point 0 is the soma; every other point's parent comes before it. */
export interface DrawnCell {
  count: number;
  x: Float32Array;
  y: Float32Array;
  parent: Int32Array;
  dist: Float32Array; // from the soma along the branches
  width: Float32Array; // of the stretch from a point's parent to it
  farthest: number; // the longest path from the soma
  meanWidth: number;
  somaRadius: number;
  spines: Float32Array; // four numbers each: from x, y to x, y
  bounds: Box; // of its points, around the soma
  grid: Map<number, number[]>; // each grid square's points, for hitCell
}

/**
 * A stretch of dendrite's width, from the tree's shape. By Rall's 3/2 rule a
 * branch that carries `tips` tips is tips^(2/3) times as wide as one tip.
 */
export function lineWidth(tips: number, size: number): number {
  const { tip, base, gain, min, max } = SHAPE.line;
  const radius = tip * size * tips ** (2 / 3);
  return Math.min(max, Math.max(min, base + gain * radius));
}

/** A soma's radius: the same share of every cell's size, within the spike's limits. */
export function somaRadius(size: number, share: number): number {
  return Math.min(SHAPE.soma.max, Math.max(SHAPE.soma.min, share * size));
}

const gridKey = (column: number, row: number) => (column + 4096) * 8192 + (row + 4096);

/** A file's cell at a size, a rotation, and a place in the spines' sequence. */
export function prepareCell(file: CellFile, shape: Shape): DrawnCell {
  const total = file.x.length;

  // Leave out axons, and number what's left.
  const kept = new Int32Array(total).fill(-1);
  let keptCount = 0;
  for (let i = 0; i < total; i++) {
    const p = file.parent[i];
    if (i === 0 || (file.kind[i] !== AXON && kept[p] >= 0)) kept[i] = keptCount++;
  }

  // The tips each point carries.
  const tips = new Int32Array(total);
  const hasChild = new Uint8Array(total);
  for (let i = 1; i < total; i++) if (kept[i] >= 0) hasChild[file.parent[i]] = 1;
  for (let i = total - 1; i >= 1; i--) {
    if (kept[i] < 0) continue;
    if (!hasChild[i]) tips[i] = 1;
    tips[file.parent[i]] += tips[i];
  }

  // Each point on the page.
  const cos = Math.cos(shape.rotation);
  const sin = Math.sin(shape.rotation);
  const flip = shape.mirror ? -1 : 1;
  const px = new Float64Array(total);
  const py = new Float64Array(total);
  for (let i = 0; i < total; i++) {
    const x = file.x[i] * flip * shape.reach;
    const y = file.y[i] * shape.reach;
    px[i] = x * cos - y * sin;
    py[i] = x * sin + y * cos;
  }

  // Cut long stretches into steps. A file point's last step ends on the point.
  const xs: number[] = [0];
  const ys: number[] = [0];
  const parents: number[] = [-1];
  const dists: number[] = [0];
  const widths: number[] = [0];
  const last = new Int32Array(total).fill(-1); // a file point's number among the drawn points
  last[0] = 0;
  let farthest = 0;
  let widthSum = 0;
  for (let i = 1; i < total; i++) {
    if (kept[i] < 0) continue;
    const p = file.parent[i];
    const length = Math.hypot(px[i] - px[p], py[i] - py[p]);
    const steps = Math.max(1, Math.ceil(length / SHAPE.step));
    const width = lineWidth(tips[i], shape.size);
    let from = last[p];
    for (let k = 1; k <= steps; k++) {
      const t = k / steps;
      xs.push(px[p] + (px[i] - px[p]) * t);
      ys.push(py[p] + (py[i] - py[p]) * t);
      parents.push(from);
      dists.push(dists[last[p]] + length * t);
      widths.push(width);
      widthSum += width;
      from = xs.length - 1;
    }
    last[i] = from;
    farthest = Math.max(farthest, dists[from]);
  }
  const count = xs.length;

  // Spines, spaced by length along each dendrite.
  const { spine } = SHAPE;
  const random = mulberry32(shape.seed * 977 + 13);
  const every = spine.every * shape.size;
  const base = Math.min(spine.max, Math.max(spine.min, shape.size / spine.perSize));
  const since = new Float64Array(total); // how far a point is past the last place for a spine
  const spines: number[] = [];
  for (let i = 1; i < total; i++) {
    if (kept[i] < 0) continue;
    const p = file.parent[i];
    const ex = px[i] - px[p];
    const ey = py[i] - py[p];
    const length = Math.hypot(ex, ey);
    const start = dists[last[p]];
    let at = every - since[p];
    for (; at <= length; at += every) {
      if (start + at < spine.from * farthest || random() > spine.keep) continue;
      const side = random() < 0.5 ? -1 : 1;
      const reach = base * (spine.vary[0] + random() * spine.vary[1]) + widths[last[i]] * 0.5;
      const x = px[p] + (ex * at) / length;
      const y = py[p] + (ey * at) / length;
      spines.push(x, y, x + (-ey / length) * side * reach, y + (ex / length) * side * reach);
    }
    since[i] = length - (at - every);
  }

  const x = Float32Array.from(xs);
  const y = Float32Array.from(ys);
  const parent = Int32Array.from(parents);
  const bounds = { left: 0, top: 0, right: 0, bottom: 0 };
  for (let i = 0; i < count; i++) {
    bounds.left = Math.min(bounds.left, x[i]);
    bounds.right = Math.max(bounds.right, x[i]);
    bounds.top = Math.min(bounds.top, y[i]);
    bounds.bottom = Math.max(bounds.bottom, y[i]);
  }

  // The lookup grid: every square a stretch passes through lists its end point.
  const grid = new Map<number, number[]>();
  const square = SHAPE.grid;
  for (let i = 1; i < count; i++) {
    const p = parent[i];
    const steps = Math.max(1, Math.ceil(Math.hypot(x[i] - x[p], y[i] - y[p]) / (square / 2)));
    let before = -1;
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const key = gridKey(
        Math.floor((x[p] + (x[i] - x[p]) * t) / square),
        Math.floor((y[p] + (y[i] - y[p]) * t) / square),
      );
      if (key === before) continue;
      before = key;
      const points = grid.get(key);
      if (!points) grid.set(key, [i]);
      else if (points[points.length - 1] !== i) points.push(i);
    }
  }

  return {
    count,
    x,
    y,
    parent,
    dist: Float32Array.from(dists),
    width: Float32Array.from(widths),
    farthest,
    meanWidth: count > 1 ? widthSum / (count - 1) : 1,
    somaRadius: somaRadius(shape.size, shape.somaShare),
    spines: Float32Array.from(spines),
    bounds,
    grid,
  };
}

/**
 * What a pointer at (x, y), in px from the cell's soma, touches: 0 for the
 * soma, the end point of the nearest stretch of dendrite within `reach`, or
 * -1 for nothing. `reach` can't be more than one grid square.
 */
export function hitCell(cell: DrawnCell, x: number, y: number, reach: number): number {
  const { bounds } = cell;
  if (x < bounds.left - reach || x > bounds.right + reach || y < bounds.top - reach || y > bounds.bottom + reach) {
    return -1;
  }
  if (Math.hypot(x, y) < cell.somaRadius + SHAPE.soma.reach) return 0;

  const column = Math.floor(x / SHAPE.grid);
  const row = Math.floor(y / SHAPE.grid);
  let best = -1;
  let nearest = reach * reach;
  for (let c = -1; c <= 1; c++) {
    for (let r = -1; r <= 1; r++) {
      const points = cell.grid.get(gridKey(column + c, row + r));
      if (!points) continue;
      for (const i of points) {
        const p = cell.parent[i];
        const ex = cell.x[i] - cell.x[p];
        const ey = cell.y[i] - cell.y[p];
        const along = ((x - cell.x[p]) * ex + (y - cell.y[p]) * ey) / (ex * ex + ey * ey || 1);
        const t = Math.min(1, Math.max(0, along));
        const d = (cell.x[p] + ex * t - x) ** 2 + (cell.y[p] + ey * t - y) ** 2;
        if (d < nearest) {
          nearest = d;
          best = i;
        }
      }
    }
  }
  return best;
}

/** The points from `point` back to the soma, the soma last. */
export function pathToSoma(cell: DrawnCell, point: number): Int32Array {
  const path: number[] = [];
  for (let i = point; i >= 0; i = cell.parent[i]) path.push(i);
  return Int32Array.from(path);
}

/**
 * A sprite's alpha, blurred: a Gaussian of standard deviation `sigma`, in the
 * sprite's own pixels. Canvas has a blur filter, but Safari doesn't run it,
 * so each cell's out-of-focus look is worked out here, the same everywhere.
 * `alpha` holds `width` × `height` values, row by row.
 */
export function blurAlpha(alpha: Uint8ClampedArray, width: number, height: number, sigma: number): Uint8ClampedArray {
  if (!(sigma > 0)) return alpha.slice();
  const radius = Math.max(1, Math.ceil(sigma * 3));
  const weights = new Float32Array(radius + 1);
  let sum = 0;
  for (let k = 0; k <= radius; k++) {
    weights[k] = Math.exp(-(k * k) / (2 * sigma * sigma));
    sum += k === 0 ? weights[k] : 2 * weights[k];
  }
  for (let k = 0; k <= radius; k++) weights[k] /= sum;

  // Across each row, then down each column. Past the sprite's edge is empty.
  const across = new Float32Array(width * height);
  for (let row = 0; row < height; row++) {
    const start = row * width;
    for (let column = 0; column < width; column++) {
      let value = alpha[start + column] * weights[0];
      for (let k = 1; k <= radius; k++) {
        if (column - k >= 0) value += alpha[start + column - k] * weights[k];
        if (column + k < width) value += alpha[start + column + k] * weights[k];
      }
      across[start + column] = value;
    }
  }
  const blurred = new Uint8ClampedArray(width * height);
  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      let value = across[row * width + column] * weights[0];
      for (let k = 1; k <= radius; k++) {
        if (row - k >= 0) value += across[(row - k) * width + column] * weights[k];
        if (row + k < height) value += across[(row + k) * width + column] * weights[k];
      }
      blurred[row * width + column] = value; // rounds to the nearest whole number
    }
  }
  return blurred;
}
