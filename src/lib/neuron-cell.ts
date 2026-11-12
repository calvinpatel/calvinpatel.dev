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
  line: { tip: 0.0022, base: 0.35, gain: 0.9, min: 0.45, max: 2.6 },
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

/** How a pointer reaches the layer. Lengths are px and times ms. */
export const POINTER = {
  mouse: 14, // how near a dendrite a mouse has to pass to touch it
  finger: 24, // and a finger or a pen
  leave: 1.5, // a branch or a soma is left only this many reaches away, so a pointer at the reach's edge can't flicker
  every: 10, // a fast pointer's path is filled in with a touch this often,
  most: 24, // up to this many between two of its events
  gap: 100, // two events further apart than this aren't one path
  perFrame: 80, // the most touches worked out in one frame
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
  branch: Int32Array; // which branch a point's stretch is part of; -1 for the soma
  branches: number; // how many branches: stretches of dendrite between branch points
  branchFrom: Int32Array; // for each branch, the point it starts from: the soma or a branch point
  branchTo: Int32Array; // and its last point: a branch point or a tip
  farthest: number; // the longest path from the soma
  meanWidth: number;
  somaRadius: number;
  spines: Float32Array; // four numbers each: from x, y to x, y
  bounds: Box; // of its points, around the soma
  grid: Map<number, number[]>; // each grid square's points, for nearBranches
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

  // The tips each point carries, and the branch each point is on. A branch
  // starts at the soma or at a branch point and runs to the next branch
  // point or to a tip.
  const tips = new Int32Array(total);
  const hasChild = new Uint8Array(total);
  const children = new Int32Array(total);
  for (let i = 1; i < total; i++) {
    if (kept[i] < 0) continue;
    hasChild[file.parent[i]] = 1;
    children[file.parent[i]]++;
  }
  const branchOf = new Int32Array(total).fill(-1);
  let branches = 0;
  for (let i = 1; i < total; i++) {
    if (kept[i] < 0) continue;
    const p = file.parent[i];
    branchOf[i] = p === 0 || children[p] > 1 ? branches++ : branchOf[p];
  }
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
  const branchIds: number[] = [-1];
  const last = new Int32Array(total).fill(-1); // a file point's number among the drawn points
  last[0] = 0;
  const branchFrom = new Int32Array(branches).fill(-1);
  const branchTo = new Int32Array(branches);
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
      branchIds.push(branchOf[i]);
      widthSum += width;
      from = xs.length - 1;
    }
    last[i] = from;
    if (branchFrom[branchOf[i]] < 0) branchFrom[branchOf[i]] = last[p];
    branchTo[branchOf[i]] = from;
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
    branch: Int32Array.from(branchIds),
    branches,
    branchFrom,
    branchTo,
    farthest,
    meanWidth: count > 1 ? widthSum / (count - 1) : 1,
    somaRadius: somaRadius(shape.size, shape.somaShare),
    spines: Float32Array.from(spines),
    bounds,
    grid,
  };
}

/** How far (x, y), in px from the cell's soma, is from touching the soma: 0 or less when it touches. */
export function somaGap(cell: DrawnCell, x: number, y: number): number {
  return Math.hypot(x, y) - cell.somaRadius - SHAPE.soma.reach;
}

/** A branch near a pointer. */
export interface Near {
  branch: number;
  point: number; // the end point of the branch's nearest stretch
  distance: number; // px, to the branch's nearest spot,
  x: number; // which is here
  y: number;
}

/** Whether two branches meet: at a branch point, or at the soma. */
export function branchesMeet(cell: DrawnCell, a: number, b: number): boolean {
  const { branchFrom, branchTo } = cell;
  return branchFrom[a] === branchFrom[b] || branchTo[a] === branchFrom[b] || branchFrom[a] === branchTo[b];
}

/**
 * Every branch within `within` px of (x, y), in px from the cell's soma: each
 * with its nearest stretch and how far away that is.
 */
export function nearBranches(cell: DrawnCell, x: number, y: number, within: number): Near[] {
  const { bounds } = cell;
  if (x < bounds.left - within || x > bounds.right + within || y < bounds.top - within || y > bounds.bottom + within) {
    return [];
  }
  const column = Math.floor(x / SHAPE.grid);
  const row = Math.floor(y / SHAPE.grid);
  const squares = Math.ceil(within / SHAPE.grid);
  const nearest = new Map<number, Near>();
  for (let c = -squares; c <= squares; c++) {
    for (let r = -squares; r <= squares; r++) {
      const points = cell.grid.get(gridKey(column + c, row + r));
      if (!points) continue;
      for (const i of points) {
        const p = cell.parent[i];
        const ex = cell.x[i] - cell.x[p];
        const ey = cell.y[i] - cell.y[p];
        const along = ((x - cell.x[p]) * ex + (y - cell.y[p]) * ey) / (ex * ex + ey * ey || 1);
        const t = Math.min(1, Math.max(0, along));
        const spotX = cell.x[p] + ex * t;
        const spotY = cell.y[p] + ey * t;
        const distance = Math.hypot(spotX - x, spotY - y);
        if (distance > within) continue;
        const branch = cell.branch[i];
        const known = nearest.get(branch);
        if (!known || distance < known.distance) nearest.set(branch, { branch, point: i, distance, x: spotX, y: spotY });
      }
    }
  }
  return [...nearest.values()];
}

/** The points from `point` back to the soma, the soma last. */
export function pathToSoma(cell: DrawnCell, point: number): Int32Array {
  const path: number[] = [];
  for (let i = point; i >= 0; i = cell.parent[i]) path.push(i);
  return Int32Array.from(path);
}

/**
 * A Gaussian blur's weights at whole pixels, for a standard deviation of
 * `sigma` pixels: weights[k] is the share a pixel takes from the one k away,
 * on either side. Together they sum to 1. No blur is the one weight, 1.
 */
export function blurWeights(sigma: number): number[] {
  if (!(sigma > 0)) return [1];
  const radius = Math.max(1, Math.ceil(sigma * 3));
  const weights: number[] = [];
  let sum = 0;
  for (let k = 0; k <= radius; k++) {
    weights.push(Math.exp(-(k * k) / (2 * sigma * sigma)));
    sum += k === 0 ? weights[k] : 2 * weights[k];
  }
  return weights.map((weight) => weight / sum);
}

/**
 * A sprite's alpha, blurred by blurWeights, worked out pixel by pixel. The
 * page blurs its sprites on the canvas instead (neuron-sprite.ts), which
 * reads no pixels back; this is the same blur done exactly, to check that
 * one against. `alpha` holds `width` × `height` values, row by row.
 */
export function blurAlpha(alpha: Uint8ClampedArray, width: number, height: number, sigma: number): Uint8ClampedArray {
  const weights = blurWeights(sigma);
  if (weights.length === 1) return alpha.slice();
  const radius = weights.length - 1;

  // Across each row, then down each column. A sprite is mostly empty, so each
  // pass spreads only the pixels that hold something. What would land past
  // the sprite's edge is lost.
  const across = new Float32Array(width * height);
  for (let row = 0; row < height; row++) {
    const start = row * width;
    for (let column = 0; column < width; column++) {
      const value = alpha[start + column];
      if (value === 0) continue;
      const from = Math.max(0, column - radius);
      const to = Math.min(width - 1, column + radius);
      for (let c = from; c <= to; c++) across[start + c] += value * weights[Math.abs(c - column)];
    }
  }
  const down = new Float32Array(width * height);
  for (let row = 0; row < height; row++) {
    const from = Math.max(0, row - radius);
    const to = Math.min(height - 1, row + radius);
    for (let column = 0; column < width; column++) {
      const value = across[row * width + column];
      if (value === 0) continue;
      for (let r = from; r <= to; r++) down[r * width + column] += value * weights[Math.abs(r - row)];
    }
  }
  return new Uint8ClampedArray(down); // each value rounds to the nearest whole number
}
