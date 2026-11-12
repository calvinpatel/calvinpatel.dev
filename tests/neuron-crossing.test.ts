// Tests for when a pointer over the neuron layer sends input. Run from the
// repo root:
//   node --test tests/neuron-crossing.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { readCellIndex } from '../src/lib/cells.ts';
import { POINTER, SHAPE, nearBranches, prepareCell, readCell, somaGap } from '../src/lib/neuron-cell.ts';
import type { CellFile, DrawnCell } from '../src/lib/neuron-cell.ts';
import { cross, noCrossing } from '../src/lib/neuron-crossing.ts';
import { mulberry32 } from '../src/lib/raster.ts';

// A trunk straight up from the soma that forks into two tips, and one branch
// to the right. At a size of 200: the trunk runs to (0, -100), the forks to
// (-60, -180) and (60, -180), and the side branch to (100, 0).
const SMALL: CellFile = {
  cellType: 'test',
  x: [0, 0, -0.3, 0.3, 0.5],
  y: [0, -0.5, -0.9, -0.9, 0],
  parent: [-1, 0, 1, 1, 0],
  kind: [1, 3, 3, 3, 3],
  dist: [0, 0.5, 1, 1, 0.5],
};
const prepare = (file: CellFile) =>
  prepareCell(file, { size: 200, reach: 200, rotation: 0, mirror: false, somaShare: 0.022, seed: 1 });
const cell = prepare(SMALL);
const MOUSE = POINTER.mouse;

type Step = [x: number, y: number];
/** A straight path from one point to another, a point every `every` px. */
function line([x0, y0]: Step, [x1, y1]: Step, every = 2): Step[] {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / every));
  return Array.from({ length: steps + 1 }, (_, k): Step => [x0 + ((x1 - x0) * k) / steps, y0 + ((y1 - y0) * k) / steps]);
}
/** What a pointer following `path` touches, in order: 'soma', or the branch crossed. */
function follow(over: DrawnCell, path: Step[], reach = MOUSE, crossing = noCrossing()): (number | 'soma')[] {
  const touched: (number | 'soma')[] = [];
  for (const [x, y] of path) {
    const point = cross(crossing, over, x, y, reach);
    if (point === 0) touched.push('soma');
    else if (point > 0) touched.push(over.branch[point]);
  }
  return touched;
}
const branchAt = (x: number, y: number) => nearBranches(cell, x, y, 2)[0].branch;
const [TRUNK, LEFT, RIGHT, SIDE] = [branchAt(0, -50), branchAt(-30, -140), branchAt(30, -140), branchAt(50, 0)];

test('crossing a branch sends one input, as the pointer comes within reach', () => {
  const crossing = noCrossing();
  const path = line([-40, -50], [40, -50]);
  const points = path.map(([x, y]) => cross(crossing, cell, x, y, MOUSE));
  const sent = points.filter((point) => point >= 0);
  assert.equal(sent.length, 1);
  assert.equal(cell.branch[sent[0]], TRUNK);
  // It is sent at the first step within reach, from the stretch nearest the pointer.
  assert.equal(path[points.indexOf(sent[0])][0], -MOUSE);
  assert.ok(Math.abs(cell.y[sent[0]] + 50) <= SHAPE.step);
});

test('staying on a branch, moving along it, and leaving it send nothing more', () => {
  const crossing = noCrossing();
  assert.deepEqual(follow(cell, line([-40, -30], [3, -30]), MOUSE, crossing), [TRUNK]);
  // Resting there, then along the trunk, then away.
  assert.deepEqual(follow(cell, [[3, -30], [3, -30], [4, -31]], MOUSE, crossing), []);
  assert.deepEqual(follow(cell, line([3, -30], [3, -80]), MOUSE, crossing), []);
  assert.deepEqual(follow(cell, line([3, -80], [-60, -80]), MOUSE, crossing), []);
});

test('coming back after leaving is a new crossing', () => {
  const crossing = noCrossing();
  assert.deepEqual(follow(cell, line([-40, -50], [0, -50]), MOUSE, crossing), [TRUNK]);
  assert.deepEqual(follow(cell, line([0, -50], [-40, -50]), MOUSE, crossing), []);
  assert.deepEqual(follow(cell, line([-40, -50], [0, -50]), MOUSE, crossing), [TRUNK]);
  // Back and forth across it: one input each way.
  assert.deepEqual(follow(cell, [...line([-40, -50], [40, -50]), ...line([40, -50], [-40, -50])]), [TRUNK, TRUNK]);
});

test("a pointer at the edge of the reach can't flicker inputs", () => {
  const crossing = noCrossing();
  const leave = MOUSE * POINTER.leave;
  // In and out across the edge of the reach, never clearly away.
  const wobble: Step[] = Array.from({ length: 40 }, (_, k): Step => [k % 2 ? MOUSE - 1 : MOUSE + 3, -50]);
  assert.deepEqual(follow(cell, wobble, MOUSE, crossing), [TRUNK]);
  // Just short of clearly away, and back: still the same crossing.
  assert.deepEqual(follow(cell, [[leave - 0.5, -50], [MOUSE - 1, -50]], MOUSE, crossing), []);
  // Clearly away, and back: a new one.
  assert.deepEqual(follow(cell, [[leave + 0.5, -50], [MOUSE - 1, -50]], MOUSE, crossing), [TRUNK]);
});

test('where branches meet, coming within reach of them together is one crossing', () => {
  // Straight down onto the fork, where the trunk and both forks meet.
  const onto = follow(cell, line([0, -150], [0, -100]));
  assert.equal(onto.length, 1);
  // And across it, side to side, just above and just below.
  for (const y of [-106, -100, -94]) assert.equal(follow(cell, line([-50, y], [50, y])).length <= 2, true);
  assert.equal(follow(cell, line([-50, -100], [50, -100])).length, 1);
  // Resting on the fork and wobbling there sends nothing more.
  const crossing = noCrossing();
  follow(cell, line([0, -150], [0, -100]), MOUSE, crossing);
  assert.deepEqual(follow(cell, [[2, -101], [-2, -99], [1, -102], [0, -98]], MOUSE, crossing), []);
});

test('following a dendrite past a fork sends one input there, not one for each branch', () => {
  // Onto the trunk, up it, and out along the left fork.
  const path = [...line([-40, -40], [0, -40]), ...line([0, -40], [0, -100]), ...line([0, -100], [-60, -180])];
  assert.deepEqual(follow(cell, path), [TRUNK, LEFT]);
  // The other way: in along the right fork, down the trunk, and off.
  const back = [...line([90, -180], [60, -180]), ...line([60, -180], [0, -100]), ...line([0, -100], [0, -30]), ...line([0, -30], [-50, -30])];
  assert.deepEqual(follow(cell, back), [RIGHT, TRUNK]);
});

test('moving onto another branch is a new crossing', () => {
  // Across the side branch, then on to the trunk.
  assert.deepEqual(follow(cell, line([60, 40], [-30, -60])), [SIDE, TRUNK]);
  // Across both forks, above where they meet.
  assert.deepEqual(follow(cell, line([-80, -150], [80, -150])), [LEFT, RIGHT]);
});

test('touching the soma fires the cell once, and again only after leaving and coming back', () => {
  const crossing = noCrossing();
  assert.deepEqual(follow(cell, line([-60, 30], [0, 0]), MOUSE, crossing), ['soma']);
  // Staying on it, and moving about on it.
  assert.deepEqual(follow(cell, [[0, 0], [3, 2], [-4, 1], [0, 0]], MOUSE, crossing), []);
  // Just off it and back, never clearly away.
  const edge = cell.somaRadius + SHAPE.soma.reach;
  assert.ok(somaGap(cell, -edge - 3, 0) > 0);
  assert.deepEqual(follow(cell, [[-edge - 3, 0], [0, 0], [-edge - 5, 0], [0, 0]], MOUSE, crossing), []);
  // Clearly away and back.
  assert.deepEqual(follow(cell, [...line([0, 0], [-60, 30]), ...line([-60, 30], [0, 0])], MOUSE, crossing), ['soma']);
});

test('leaving the soma along one of its dendrites sends nothing', () => {
  const crossing = noCrossing();
  assert.deepEqual(follow(cell, line([-60, 30], [0, 0]), MOUSE, crossing), ['soma']);
  assert.deepEqual(follow(cell, line([0, 0], [90, 0]), MOUSE, crossing), []);
  // Arriving along a dendrite still touches the soma.
  assert.deepEqual(follow(cell, line([60, 40], [60, 0])), [SIDE]);
  assert.deepEqual(follow(cell, [...line([60, 40], [60, 0]), ...line([60, 0], [0, 0])]), [SIDE, 'soma']);
});

test('a finger reaches further, and has to move further to leave', () => {
  const finger = POINTER.finger;
  const crossing = noCrossing();
  assert.deepEqual(follow(cell, [[finger - 1, -50]], finger, crossing), [TRUNK]);
  assert.deepEqual(follow(cell, [[finger - 1, -50]], MOUSE), []);
  assert.deepEqual(follow(cell, [[finger * POINTER.leave - 1, -50], [finger - 1, -50]], finger, crossing), []);
  assert.deepEqual(follow(cell, [[finger * POINTER.leave + 1, -50], [finger - 1, -50]], finger, crossing), [TRUNK]);
});

test('each new touch of a finger starts afresh: a second tap on a branch is a second crossing', () => {
  assert.deepEqual(follow(cell, [[5, -50]], POINTER.finger, noCrossing()), [TRUNK]);
  assert.deepEqual(follow(cell, [[5, -50]], POINTER.finger, noCrossing()), [TRUNK]);
  // The same pointer, not lifted, sends nothing for the second.
  assert.deepEqual(follow(cell, [[5, -50], [5, -50]], POINTER.finger), [TRUNK]);
});

test('on the real cells, a branch never sends twice without being left in between', () => {
  const random = mulberry32(7);
  const files = readCellIndex().map((entry) => readCell(JSON.parse(readFileSync(`public/cells/${entry.file}`, 'utf8'))));
  const leave = MOUSE * POINTER.leave;
  let inputs = 0;
  for (const file of files) {
    const real = prepare(file);
    for (let pass = 0; pass < 6; pass++) {
      // A straight sweep across the cell, at any angle, at any distance from its soma.
      const angle = random() * Math.PI;
      const offset = (random() - 0.5) * 240;
      const [dx, dy] = [Math.cos(angle), Math.sin(angle)];
      const start: Step = [-dx * 320 - dy * offset, -dy * 320 + dx * offset];
      const end: Step = [dx * 320 - dy * offset, dy * 320 + dx * offset];
      const crossing = noCrossing();
      const wasLeft = new Map<number, boolean>(); // each branch that has sent: has the pointer left it since
      for (const [x, y] of line(start, end, 3)) {
        const point = cross(crossing, real, x, y, MOUSE);
        const within = new Set(nearBranches(real, x, y, leave).map((one) => one.branch));
        for (const branch of wasLeft.keys()) if (!within.has(branch)) wasLeft.set(branch, true);
        if (point <= 0) continue;
        inputs++;
        const branch = real.branch[point];
        assert.notEqual(wasLeft.get(branch), false, 'a branch sent twice without being left');
        wasLeft.set(branch, false);
        // What it sends from is within reach.
        assert.ok(nearBranches(real, x, y, MOUSE).some((one) => one.branch === branch));
      }
    }
  }
  assert.ok(inputs > 100, `${inputs} inputs`);
});
