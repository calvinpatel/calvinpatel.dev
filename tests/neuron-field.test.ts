// Tests for where the hero's neuron layer puts things. Run from the repo root:
//   node --test tests/neuron-field.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  FIELD,
  REST_MAX,
  blurOf,
  canvasScale,
  cellCount,
  cellOrder,
  driftAt,
  placeCells,
  placeNuclei,
  restAlpha,
  sizeBasis,
} from '../src/lib/neuron-field.ts';

// The ten cells in index.json's order: seven medium spiny, then three pyramidal.
const PYRAMIDAL = [false, false, false, false, false, false, false, true, true, true];
// --neuron-drift-min and --neuron-drift-max, as NeuronLayer.astro's script reads them.
const DRIFT = { min: 19000, max: 33000 };

const place = (width: number, height: number, seed?: number) => placeCells(width, height, PYRAMIDAL, DRIFT, seed);

test('the number of cells follows the area, within its limits', () => {
  assert.equal(cellCount(1440, 900), 13);
  assert.equal(cellCount(375, 667), FIELD.count.min);
  assert.equal(cellCount(1920, 1080), FIELD.count.max);
  assert.equal(cellCount(2560, 1440), FIELD.count.max);
});

test('the pyramidal cells are spread among the others', () => {
  const order = cellOrder(PYRAMIDAL);
  assert.deepEqual([...order].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(
    order.map((cell) => (PYRAMIDAL[cell] ? 'P' : 'm')),
    ['P', 'm', 'm', 'P', 'm', 'm', 'P', 'm', 'm', 'm'],
  );
  // A phone's six cells hold both kinds.
  assert.equal(order.slice(0, 6).filter((cell) => PYRAMIDAL[cell]).length, 2);
  assert.deepEqual(cellOrder([false, false]), [0, 1]);
  assert.deepEqual(cellOrder([true, true]), [0, 1]);
  assert.deepEqual(cellOrder([]), []);
});

test('the same window always gets the same field', () => {
  assert.deepEqual(place(1440, 900), place(1440, 900));
  assert.notDeepEqual(place(1440, 900), place(1441, 900));
  assert.notDeepEqual(place(1440, 900), place(1440, 900, 7));
  assert.deepEqual(placeCells(1440, 900, [], DRIFT), []);
});

test("cells are sized by the hero's shorter side, which counts as at least the floor", () => {
  // A desktop 900px tall or more is sized by its own shorter side.
  assert.equal(sizeBasis(1440, 900), 900);
  assert.equal(sizeBasis(1920, 1080), 1080);
  // A phone, and a short desktop, by the floor.
  assert.equal(sizeBasis(375, 812), FIELD.size.floor);
  assert.equal(sizeBasis(1280, 720), FIELD.size.floor);
  assert.equal(sizeBasis(1366, 768), FIELD.size.floor);

  // On a phone that is about the phone artboard's scale: 160 to 300px or so from soma to tip.
  for (const cell of place(375, 812)) assert.ok(cell.size >= 160 && cell.size <= 304);
  // At 1440 x 900 nothing changes: 180 to 342px.
  for (const cell of place(1440, 900)) assert.ok(cell.size >= 180 && cell.size <= 342);
});

test('cells are placed inside the hero or just past its edges, and drawn farthest first', () => {
  for (const [width, height] of [
    [1440, 900],
    [375, 667],
    [1920, 1080],
    [800, 1100],
  ]) {
    const cells = place(width, height);
    const basis = sizeBasis(width, height);
    assert.equal(cells.length, cellCount(width, height));
    cells.forEach((cell, i) => {
      assert.ok(cell.size >= basis * FIELD.size.min && cell.size <= basis * (FIELD.size.min + FIELD.size.vary));
      assert.ok(cell.depth >= FIELD.depth.min && cell.depth <= 1);
      assert.ok(cell.x >= -FIELD.past * width && cell.x <= (1 + FIELD.past) * width);
      assert.ok(cell.y >= -FIELD.past * height && cell.y <= (1 + FIELD.past) * height);
      assert.ok(cell.period >= DRIFT.min && cell.period <= DRIFT.max);
      if (i > 0) assert.ok(cell.depth >= cells[i - 1].depth);
    });
  }
});

test('pyramidal cells are drawn larger and stay apical-up; the others turn any way', () => {
  const cells = place(1920, 1080);
  const tall = cells.filter((cell) => PYRAMIDAL[cell.cell]);
  const others = cells.filter((cell) => !PYRAMIDAL[cell.cell]);
  assert.ok(tall.length >= 3 && others.length >= 7);
  for (const cell of tall) {
    assert.equal(cell.reach, cell.size * FIELD.pyramidal.scale);
    assert.ok(Math.abs(cell.rotation) <= FIELD.pyramidal.tilt / 2);
  }
  for (const cell of others) {
    assert.equal(cell.reach, cell.size);
    assert.ok(cell.rotation >= 0 && cell.rotation < 2 * Math.PI);
  }
  // They don't all face one way.
  assert.ok(Math.max(...others.map((cell) => cell.rotation)) - Math.min(...others.map((cell) => cell.rotation)) > 1);
});

test('a cell used a second time is flipped', () => {
  const cells = place(1920, 1080);
  assert.equal(cells.length, 16);
  for (let cell = 0; cell < 10; cell++) {
    const uses = cells.filter((placed) => placed.cell === cell);
    assert.ok(uses.length === 1 || uses.length === 2);
    assert.deepEqual(uses.map((use) => use.mirror).sort(), uses.length === 1 ? [false] : [false, true]);
  }
  assert.ok(place(1440, 900).filter((cell) => cell.mirror).length === 3);
  assert.ok(place(375, 667).every((cell) => !cell.mirror));
});

test('somas keep apart', () => {
  for (const [width, height] of [
    [1440, 900],
    [375, 667],
    [1920, 1080],
  ]) {
    const cells = place(width, height);
    for (const a of cells) {
      for (const b of cells) {
        if (a === b) continue;
        assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= (a.size + b.size) * FIELD.apart);
      }
    }
  }
});

test('about six cells in ten are GFP', () => {
  let gfp = 0;
  let all = 0;
  for (let seed = 1; seed <= 40; seed++) {
    for (const cell of place(1920, 1080, seed)) {
      all++;
      if (cell.color === 'gfp') gfp++;
    }
  }
  assert.ok(Math.abs(gfp / all - FIELD.gfp) < 0.06, `${gfp} of ${all}`);
});

test('nearer cells are sharper, brighter, and drift further', () => {
  assert.ok(Math.abs(blurOf(1) - 0.2) < 1e-12);
  assert.ok(Math.abs(blurOf(FIELD.depth.min) - 1.1) < 1e-12);
  assert.ok(Math.abs(restAlpha(FIELD.depth.min) - 0.12) < 1e-12);
  assert.ok(Math.abs(restAlpha(1) - REST_MAX) < 1e-12);
  assert.ok(Math.abs(REST_MAX - 0.24) < 1e-12);

  const [cell] = place(1440, 900);
  const far = { ...cell, depth: FIELD.depth.min, phase: 0 };
  const near = { ...cell, depth: 1, phase: 0 };
  // A quarter of the way through, a cell is as far to the side as it goes.
  assert.ok(Math.abs(driftAt(far, far.period / 4)[0] - 6.5) < 1e-9);
  assert.ok(Math.abs(driftAt(near, near.period / 4)[0] - 14) < 1e-9);
});

test('a drift is slow and never jumps', () => {
  const [cell] = place(1440, 900);
  let [x, y] = driftAt(cell, 0);
  for (let time = 16; time <= 5000; time += 16) {
    const [nextX, nextY] = driftAt(cell, time);
    assert.ok(Math.hypot(nextX - x, nextY - y) < 0.1);
    [x, y] = [nextX, nextY];
  }
  // Back where it started after one period, side to side.
  assert.ok(Math.abs(driftAt(cell, cell.period)[0] - driftAt(cell, 0)[0]) < 1e-9);
});

test('the nuclei are spread across the hero, one for every 7,000 px² or so', () => {
  const nuclei = placeNuclei(1440, 900);
  const shown = nuclei.filter((nucleus) => nucleus.y < 900);
  assert.ok(Math.abs(shown.length - (1440 * 900) / FIELD.nuclei.area) < 20, `${shown.length} nuclei`);
  for (const nucleus of nuclei) {
    assert.ok(nucleus.x >= 0 && nucleus.x < 1440 && nucleus.y >= 0);
    assert.ok(nucleus.radius >= 0.7 && nucleus.radius <= 4.5);
    assert.ok(nucleus.alpha >= 0.05 && nucleus.alpha <= 0.32);
    assert.ok(nucleus.squash >= 0.75 && nucleus.squash <= 1);
  }
  const soft = nuclei.filter((nucleus) => nucleus.radius >= 2.1).length;
  assert.ok(Math.abs(soft / nuclei.length - FIELD.nuclei.soft) < 0.08);
});

test('a hero that grows keeps every nucleus it had', () => {
  const short = placeNuclei(375, 600);
  const tall = placeNuclei(375, 1300);
  assert.ok(tall.length > short.length);
  assert.deepEqual(tall.slice(0, short.length), short);
  assert.notDeepEqual(placeNuclei(376, 600), short);
});

test('the canvas is never drawn finer than twice, or larger than its limit', () => {
  assert.equal(canvasScale(1440, 900, 1), 1);
  assert.equal(canvasScale(1440, 900, 2), 2);
  assert.equal(canvasScale(390, 844, 3), 2);
  assert.equal(canvasScale(1440, 900, 0), 1);
  const scale = canvasScale(3840, 2160, 2);
  assert.ok(scale < 2 && 3840 * 2160 * scale * scale <= FIELD.pixels + 1);
});
