// Tests for one neuron of the hero's neuron layer. Run from the repo root:
//   node --test tests/neuron-cell.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { readCellIndex } from '../src/lib/cells.ts';
import {
  SHAPE,
  blurAlpha,
  hitCell,
  lineWidth,
  pathToSoma,
  prepareCell,
  readCell,
  somaRadius,
} from '../src/lib/neuron-cell.ts';
import type { CellFile, Shape } from '../src/lib/neuron-cell.ts';

// --neuron-soma, as NeuronLayer.astro's script reads it.
const SOMA = 0.022;

// The ten real cells.
const files = readCellIndex().map((entry) => ({
  id: entry.id,
  file: readCell(JSON.parse(readFileSync(`public/cells/${entry.file}`, 'utf8'))),
}));

// A small cell: a trunk straight up that forks into two tips, and one branch to the right.
//
//        2   3
//         \ /
//          1          4 is the branch's one point
//          |
//          0 ---- 4
const SMALL: CellFile = {
  cellType: 'test',
  x: [0, 0, -0.3, 0.3, 0.5],
  y: [0, -0.5, -0.9, -0.9, 0],
  parent: [-1, 0, 1, 1, 0],
  kind: [1, 3, 3, 3, 3],
  dist: [0, 0.5, 1, 1, 0.5],
};

const shape = (more: Partial<Shape> = {}): Shape => ({
  size: 200,
  reach: 200,
  rotation: 0,
  mirror: false,
  somaShare: SOMA,
  seed: 1,
  ...more,
});

const near = (a: number, b: number, within = 1e-3) => Math.abs(a - b) <= within;

test('a file that is not cell-web/1 is refused', () => {
  assert.throws(() => readCell({ format: 'cell-web/2' }), /not a cell-web\/1 file/);
  assert.throws(() => readCell(null), /not a cell-web\/1 file/);
  assert.throws(() => readCell({ format: 'cell-web/1', ...SMALL, dist: [0] }), /differ in length/);
  assert.throws(() => readCell({ format: 'cell-web/1', ...SMALL, parent: [-1, 0, 3, 1, 0] }), /before its parent/);
  assert.equal(readCell({ format: 'cell-web/1', ...SMALL }).x.length, 5);
});

test('a cell is scaled to its reach around its soma, y down the screen', () => {
  const cell = prepareCell(SMALL, shape());
  assert.equal(cell.x[0], 0);
  assert.equal(cell.y[0], 0);
  assert.equal(cell.parent[0], -1);
  assert.ok(near(cell.bounds.top, -180));
  assert.ok(near(cell.bounds.right, 100));
  assert.ok(near(cell.bounds.left, -60));
  assert.ok(near(cell.bounds.bottom, 0));
  assert.ok(near(cell.farthest, 200));
});

test('long stretches are cut into steps, and every point still follows its parent', () => {
  const cell = prepareCell(SMALL, shape());
  assert.ok(cell.count > SMALL.x.length);
  for (let i = 1; i < cell.count; i++) {
    const p = cell.parent[i];
    assert.ok(p >= 0 && p < i);
    const step = Math.hypot(cell.x[i] - cell.x[p], cell.y[i] - cell.y[p]);
    assert.ok(step <= SHAPE.step + 1e-3);
    // The distance from the soma adds up along the branches.
    assert.ok(near(cell.dist[i], cell.dist[p] + step, 1e-2));
  }
});

test('turning or flipping a cell moves its points, not its distances', () => {
  const plain = prepareCell(SMALL, shape());
  const turned = prepareCell(SMALL, shape({ rotation: Math.PI / 2 }));
  const flipped = prepareCell(SMALL, shape({ mirror: true }));
  // A quarter turn clockwise: the trunk that pointed up now points right.
  assert.ok(near(turned.bounds.right, 180));
  assert.ok(near(flipped.bounds.left, -100));
  assert.ok(near(flipped.bounds.right, 60));
  assert.deepEqual(turned.dist, plain.dist);
  assert.deepEqual(flipped.dist, plain.dist);
});

test('a line is as wide as the tips it carries, by the 3/2 rule, within the limits', () => {
  const { line } = SHAPE;
  const size = 260;
  assert.ok(near(lineWidth(1, size), line.base + line.gain * line.tip * size));
  assert.ok(near(lineWidth(8, size), line.base + line.gain * line.tip * size * 4));
  assert.equal(lineWidth(1, 10), line.min);
  assert.equal(lineWidth(500, size), line.max);
  for (let tips = 1; tips < 80; tips++) assert.ok(lineWidth(tips + 1, size) >= lineWidth(tips, size));

  // The trunk carries two tips, each fork and the side branch one.
  const cell = prepareCell(SMALL, shape({ size: 260, reach: 260 }));
  const widths = [...new Set([...cell.width.slice(1)].map((width) => width.toFixed(3)))].sort();
  assert.deepEqual(widths, [lineWidth(1, 260).toFixed(3), lineWidth(2, 260).toFixed(3)]);
});

test("a soma is the same share of every cell's size, within the spike's limits", () => {
  assert.ok(near(somaRadius(200, SOMA), 4.4));
  assert.equal(somaRadius(75, SOMA), SHAPE.soma.min);
  assert.equal(somaRadius(400, SOMA), SHAPE.soma.max);
  // A cell drawn larger than its size keeps its size's soma.
  const larger = prepareCell(SMALL, shape({ reach: 270 }));
  assert.equal(larger.somaRadius, prepareCell(SMALL, shape()).somaRadius);
});

test('a cell drawn larger keeps the line widths of its size', () => {
  const plain = prepareCell(SMALL, shape());
  const larger = prepareCell(SMALL, shape({ reach: 270 }));
  assert.equal(larger.width[1], plain.width[1]);
  assert.ok(near(larger.farthest, 270));
});

test('spines are spaced by length, not by point', () => {
  const size = 200;
  const cell = prepareCell(SMALL, shape({ size, reach: size }));
  const count = cell.spines.length / 4;
  // 400px of dendrite, less the first 12% of the longest path on each of the
  // two stems; a place every 4px; 45% kept.
  const places = (400 - 2 * SHAPE.spine.from * 200) / (SHAPE.spine.every * size);
  assert.ok(count > places * 0.3 && count < places * 0.6, `${count} spines`);

  // The same cell with every stretch written as many short points grows the same number.
  const dense: CellFile = { cellType: 'test', x: [0], y: [0], parent: [-1], kind: [1], dist: [0] };
  const ends = [0];
  for (let i = 1; i < SMALL.x.length; i++) {
    const p = SMALL.parent[i];
    let from = ends[p];
    for (let k = 1; k <= 25; k++) {
      dense.x.push(SMALL.x[p] + ((SMALL.x[i] - SMALL.x[p]) * k) / 25);
      dense.y.push(SMALL.y[p] + ((SMALL.y[i] - SMALL.y[p]) * k) / 25);
      dense.parent.push(from);
      dense.kind.push(3);
      dense.dist.push(0);
      from = dense.x.length - 1;
    }
    ends.push(from);
  }
  const denseCount = prepareCell(dense, shape({ size, reach: size })).spines.length / 4;
  assert.ok(Math.abs(denseCount - count) <= count * 0.25, `${denseCount} against ${count}`);

  for (let s = 0; s < cell.spines.length; s += 4) {
    const [x0, y0, x1, y1] = cell.spines.slice(s, s + 4);
    const length = Math.hypot(x1 - x0, y1 - y0);
    assert.ok(length > 0 && length <= SHAPE.spine.max * (SHAPE.spine.vary[0] + SHAPE.spine.vary[1]) + SHAPE.line.max / 2);
    // None near the soma.
    assert.ok(Math.hypot(x0, y0) >= SHAPE.spine.from * 200 - 1e-3);
  }
});

test('the same seed grows the same spines, and another seed different ones', () => {
  assert.deepEqual(prepareCell(SMALL, shape()).spines, prepareCell(SMALL, shape()).spines);
  assert.notDeepEqual(prepareCell(SMALL, shape({ seed: 2 })).spines, prepareCell(SMALL, shape()).spines);
});

test('axon points are left out', () => {
  // The side branch as an axon, with a dendrite-coded point hanging off it.
  const withAxon: CellFile = {
    ...SMALL,
    x: [...SMALL.x, 0.7],
    y: [...SMALL.y, 0],
    parent: [...SMALL.parent, 4],
    kind: [1, 3, 3, 3, 2, 3],
    dist: [...SMALL.dist, 0.7],
  };
  const cell = prepareCell(withAxon, shape());
  assert.ok(near(cell.bounds.right, 60));
});

test('a pointer finds the soma, the nearest dendrite, or nothing', () => {
  const cell = prepareCell(SMALL, shape());
  const reach = 14;
  assert.equal(hitCell(cell, 0, 0, reach), 0);
  assert.equal(hitCell(cell, cell.somaRadius + SHAPE.soma.reach - 1, 0, reach), 0);

  // Beside the trunk, halfway up: a point on the trunk.
  const onTrunk = hitCell(cell, 6, -50, reach);
  assert.ok(onTrunk > 0);
  assert.ok(near(cell.x[onTrunk], 0) && cell.y[onTrunk] <= -44 && cell.y[onTrunk] >= -58);

  // Between the trunk and the side branch, out of reach of both.
  assert.equal(hitCell(cell, 40, -40, reach), -1);
  assert.equal(hitCell(cell, 40, -40, 24) > 0, false);
  // A finger's wider reach finds what a mouse's doesn't.
  assert.equal(hitCell(cell, 60, -20, reach), -1);
  assert.ok(hitCell(cell, 60, -20, 24) > 0);
  // Outside the cell altogether.
  assert.equal(hitCell(cell, 300, 300, reach), -1);
});

test('the path from a point runs back to the soma', () => {
  const cell = prepareCell(SMALL, shape());
  const tip = cell.dist.indexOf(Math.max(...cell.dist));
  const path = pathToSoma(cell, tip);
  assert.equal(path[0], tip);
  assert.equal(path[path.length - 1], 0);
  for (let k = 1; k < path.length; k++) {
    assert.equal(path[k], cell.parent[path[k - 1]]);
    assert.ok(cell.dist[path[k]] < cell.dist[path[k - 1]]);
  }
  assert.deepEqual([...pathToSoma(cell, 0)], [0]);
});

test('every real cell prepares: no axon, one soma, spines by length, a hit on every stretch', () => {
  assert.equal(files.length, 10);
  for (const { id, file } of files) {
    assert.ok(!file.kind.includes(2), `${id} has an axon now: the layer leaves axons out`);
    const size = 260;
    const cell = prepareCell(file, shape({ size, reach: size }));
    assert.ok(near(cell.farthest / size, Math.max(...file.dist), 0.01), id);
    assert.ok(cell.bounds.right - cell.bounds.left <= 2 * size + 1, id);

    // One spine every 11.6px or so of dendrite, whatever the file's point spacing.
    let length = 0;
    for (let i = 1; i < cell.count; i++) length += cell.dist[i] - cell.dist[cell.parent[i]];
    const perSpine = length / (cell.spines.length / 4);
    assert.ok(perSpine > 10 && perSpine < 16, `${id}: a spine every ${perSpine.toFixed(1)}px`);

    // A pointer on any point of the cell finds the cell.
    for (let i = 1; i < cell.count; i += 7) assert.ok(hitCell(cell, cell.x[i], cell.y[i], 14) >= 0, id);
  }
});

test('the pyramidal cells point up, and their trunk is their widest line', () => {
  for (const { id, file } of files.filter(({ file }) => file.cellType === 'pyramidal')) {
    const cell = prepareCell(file, shape({ size: 260, reach: 351 }));
    assert.ok(-cell.bounds.top > 2 * cell.bounds.bottom, id);
    assert.ok(near(Math.max(...cell.width), SHAPE.line.max), id);  }
});

test('blurring spreads a sprite without adding or losing light', () => {
  const [width, height] = [41, 41];
  const alpha = new Uint8ClampedArray(width * height);
  // A line down the middle.
  for (let row = 8; row < 33; row++) alpha[row * width + 20] = 255;
  const total = (values: Uint8ClampedArray) => values.reduce((sum, value) => sum + value, 0);

  const blurred = blurAlpha(alpha, width, height, 1.1);
  assert.ok(Math.abs(total(blurred) - total(alpha)) / total(alpha) < 0.02);
  const row = 20 * width;
  assert.ok(blurred[row + 20] < 255 && blurred[row + 20] > blurred[row + 21]);
  assert.equal(blurred[row + 19], blurred[row + 21]);
  assert.ok(blurred[row + 21] > blurred[row + 22] && blurred[row + 22] > 0);
  assert.equal(blurred[row + 20 + 6], 0);
  // A wider blur is flatter.
  assert.ok(blurAlpha(alpha, width, height, 2.2)[row + 20] < blurred[row + 20]);
  // No blur changes nothing, and nothing is changed in place.
  assert.deepEqual(blurAlpha(alpha, width, height, 0), alpha);
  assert.equal(alpha[row + 21], 0);
});
