// Tests for the hero brain's geometry. Run from the repo root:
//   node --test tests/brain.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  LOBES,
  VIEW,
  areaOf,
  buildBrain,
  closeView,
  dotsD,
  foliaD,
  inside,
  lengthOf,
  narrowestLobe,
  nearest,
  nucleiGroups,
  pathD,
  unit,
} from '../src/lib/brain.ts';
import type { Vec } from '../src/lib/brain.ts';

const brain = buildBrain();

// A tenth of a unit, which is how finely path data is written.
const TENTH = 0.1;
const near = (a: number, b: number, within = 1e-9) => Math.abs(a - b) <= within;

const boundsOf = (points: readonly Vec[]) => {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map((v) => Math.round(v * 10) / 10);
};

// Path data back into points, to check what pathD wrote.
function pointsOf(d: string): Vec[] {
  const numbers = (text: string) => (text.match(/-?(?:\d+\.?\d*|\.\d+)/g) ?? []).map(Number);
  const [start, steps = ''] = d.replace(/z$/, '').slice(1).split('l');
  let [x, y] = numbers(start);
  const points: Vec[] = [[x, y]];
  const deltas = numbers(steps);
  for (let i = 0; i < deltas.length; i += 2) {
    x += deltas[i];
    y += deltas[i + 1];
    points.push([x, y]);
  }
  return points;
}

test('the same seed always gives the same brain, and another seed a different one', () => {
  assert.deepEqual(buildBrain(), brain);
  assert.deepEqual(buildBrain(11), brain);
  assert.notDeepEqual(buildBrain(12).outline, brain.outline);
});

test('the lobes are in navigation order, each leading to its section', () => {
  assert.deepEqual(
    brain.lobes.map((lobe) => [lobe.id, lobe.section]),
    [
      ['frontal', 'about'],
      ['occipital', 'projects'],
      ['temporal', 'experience'],
      ['cerebellum', 'skills'],
      ['parietal', 'contact'],
    ],
  );
});

test("seed 11 is the approved spike's brain", () => {
  // Pinned from docs/spikes/brain-navigation.html, run with the same seed.
  assert.deepEqual(boundsOf(brain.outline), [67.6, 45.9, 579.7, 327]);
  assert.deepEqual(boundsOf(brain.cerebellum), [426, 283.5, 594.6, 394.7]);
  assert.deepEqual(boundsOf(brain.stem), [380, 319.9, 438.1, 465.1]);
  assert.deepEqual(
    brain.lobes.map((lobe) => lobe.cells.length),
    [13, 4, 10, 9, 10],
  );
  assert.deepEqual(
    brain.lobes.map((lobe) => lobe.cells.filter((cell) => cell.color === 'gfp').length),
    [7, 3, 6, 6, 6],
  );
  assert.deepEqual(
    brain.lobes.map((lobe) => lobe.nuclei.dots.length),
    [514, 149, 372, 441, 382],
  );
  assert.equal(brain.stemNuclei.dots.length, 89);
  assert.equal(brain.sulci.length, 15);
  assert.equal(brain.folia.length, 8);
});

test('the callouts keep their lengths; only the temporal one moved', () => {
  // The spike's were 151.4, 172.8, 151.4, 111.3, and 132.7. The temporal
  // callout now ends at (236, 440).
  assert.deepEqual(
    brain.lobes.map((lobe) => Math.round(lobe.callout.length * 10) / 10),
    [151.4, 172.8, 154, 111.3, 132.7],
  );
  assert.deepEqual(brain.lobes[2].label.anchor, [236, 440]);
});

test('the four cerebral lobes tile the outline', () => {
  const cerebral = brain.lobes.filter((lobe) => lobe.id !== 'cerebellum');
  const sum = cerebral.reduce((total, lobe) => total + areaOf(lobe.region), 0);
  assert.ok(near(sum, areaOf(brain.outline), 1e-6), `${sum} against ${areaOf(brain.outline)}`);
  assert.equal(brain.lobes[3].region, brain.cerebellum);
});

test('every nucleus is inside its region, in the band its depth gives', () => {
  for (const lobe of brain.lobes) {
    const surface = lobe.id === 'cerebellum' ? brain.cerebellum : brain.outline;
    for (const dot of lobe.nuclei.dots) {
      assert.ok(inside([dot.x, dot.y], lobe.region), `${lobe.id} ${dot.x}, ${dot.y}`);
      const depth = nearest([dot.x, dot.y], surface).distance;
      assert.equal(dot.band, depth < 9 ? 0 : depth < 26 ? 1 : 2);
      assert.ok(dot.radius >= 0.55 && dot.radius < 1.2);
    }
    assert.equal(lobe.nuclei.delays.length, 6);
  }
  for (const dot of brain.stemNuclei.dots) assert.ok(inside([dot.x, dot.y], brain.stem));
});

test('every cell sits inside its lobe, clear of its edge and of its neighbors', () => {
  for (const lobe of brain.lobes) {
    const gap = lobe.id === 'cerebellum' ? 17 : 26;
    lobe.cells.forEach((cell, i) => {
      assert.ok(inside([cell.x, cell.y], lobe.region), `${lobe.id} cell ${i}`);
      assert.ok(nearest([cell.x, cell.y], lobe.region).distance >= 7);
      for (const other of lobe.cells.slice(i + 1)) {
        assert.ok(Math.hypot(other.x - cell.x, other.y - cell.y) >= gap);
      }
    });
  }
});

test("a cell's firing paths start at its soma: one apical dendrite and one axon", () => {
  for (const cell of brain.lobes.flatMap((lobe) => lobe.cells)) {
    assert.equal(cell.thick.length, 1);
    assert.equal(cell.axon.length, 1);
    assert.deepEqual(cell.thick[0][0], [cell.x, cell.y]);
    assert.deepEqual(cell.axon[0][0], [cell.x, cell.y]);
    assert.ok(cell.thin.length >= 2);
  }
});

test('a callout runs from inside its lobe to its label anchor, inside the viewBox', () => {
  brain.lobes.forEach((lobe, i) => {
    const { callout, label } = lobe;
    assert.deepEqual(callout.from, LOBES[i].from);
    assert.deepEqual(callout.main[0], callout.from);
    assert.deepEqual(callout.main.at(-1), label.anchor);
    assert.ok(inside(callout.from, lobe.region), lobe.id);
    assert.ok(!inside(label.anchor, brain.outline) && !inside(label.anchor, brain.cerebellum), lobe.id);
    assert.ok(near(callout.length, lengthOf(callout.main)));
    assert.equal(callout.twigs.length, 2);
    for (const twig of callout.twigs) assert.ok(callout.main.includes(twig[0]), 'a twig branches off the line');
    const [x, y] = label.anchor;
    assert.ok(x >= VIEW.x && x <= VIEW.x + VIEW.width && y >= VIEW.y && y <= VIEW.y + VIEW.height);
  });
});

test('no label anchor sits over the brain, the cerebellum, or the stem', () => {
  for (const { label, id } of brain.lobes) {
    for (const tissue of [brain.outline, brain.cerebellum, brain.stem]) {
      assert.ok(!inside(label.anchor, tissue), id);
      assert.ok(nearest(label.anchor, tissue).distance > 10, id);
    }
  }
});

test('labels on the left of the brain grow left, and the others right; only Skills hangs below', () => {
  assert.deepEqual(
    brain.lobes.map((lobe) => [lobe.label.side, lobe.label.below]),
    [
      ['left', false],
      ['right', false],
      ['left', false],
      ['right', true],
      ['left', false],
    ],
  );
});

test('a cerebral lobe lifts away from the middle of the brain, the cerebellum from its own', () => {
  const [left, top, right, bottom] = boundsOf(brain.outline);
  for (const lobe of brain.lobes) {
    const [x, y] = lobe.origin;
    if (lobe.id === 'cerebellum') {
      assert.ok(inside(lobe.origin, brain.cerebellum));
    } else {
      assert.ok(Math.abs(x - (left + right) / 2) < 25 && Math.abs(y - (top + bottom) / 2) < 25, `${lobe.id} ${x}, ${y}`);
    }
  }
});

test("the close view holds the brain's own bounds and none of the labels' room", () => {
  const view = closeView(brain);
  assert.deepEqual(view, { x: 61.6, y: 39.9, width: 539, height: 431.2 });
  for (const [x, y] of [...brain.outline, ...brain.cerebellum, ...brain.stem]) {
    assert.ok(x >= view.x + 5.9 && x <= view.x + view.width - 5.9, `${x}`);
    assert.ok(y >= view.y + 5.9 && y <= view.y + view.height - 5.9, `${y}`);
  }
  assert.ok(view.x >= VIEW.x && view.x + view.width <= VIEW.x + VIEW.width);
  assert.ok(view.y >= VIEW.y && view.y + view.height <= VIEW.y + VIEW.height);
  // Every lobe is then a tap target on a 320px phone, whose content is 280px wide.
  const scale = 280 / view.width;
  for (const lobe of brain.lobes) {
    const [left, top, right, bottom] = boundsOf(lobe.region);
    assert.ok((right - left) * scale >= 44 && (bottom - top) * scale >= 44, lobe.id);
  }
});

test("the narrowest lobe is the occipital, side to side, and sets the phone figure's least size", () => {
  const narrowest = narrowestLobe(brain);
  const [left, , right] = boundsOf(brain.lobes[1].region);
  assert.ok(Math.abs(narrowest - (right - left)) < 0.1, `${narrowest}`);
  assert.ok(Math.abs(narrowest - 90.2) < 0.05);
  // The close view's width at which that lobe is a 44px tap target.
  const least = (44 * closeView(brain).width) / narrowest;
  assert.ok(least > 262 && least < 264, `${least}`);
});

test('pathD writes each point to a tenth of a unit, as steps', () => {
  assert.equal(
    pathD([
      [10, 20],
      [10.5, 19.4],
      [12, 19.4],
    ]),
    'M10 20l.5-.6 1.5 0',
  );
  assert.equal(
    pathD(
      [
        [0.04, -0.26],
        [-1, 2],
      ],
      true,
    ),
    'M0-.3l-1 2.3z',
  );
  assert.equal(pathD([[5, 5]]), 'M5 5');
  for (const points of [brain.outline, brain.lobes[0].region, brain.lobes[0].cells[0].thin[0], brain.sulci[3]]) {
    const read = pointsOf(pathD(points));
    assert.equal(read.length, points.length);
    // Rounding never adds up along the path: every point is within half a tenth.
    read.forEach((point, i) => {
      assert.ok(near(point[0], points[i][0], TENTH / 2 + 1e-6) && near(point[1], points[i][1], TENTH / 2 + 1e-6), `${i}`);
    });
  }
});

test('unit, dotsD, and foliaD write the shortest numbers', () => {
  assert.equal(unit(0.55), '.6');
  assert.equal(unit(-12.04), '-12');
  assert.equal(unit(-0.01), '0');
  assert.equal(
    dotsD([
      { x: 384.94, y: 373.8 },
      { x: 0.5, y: -2 },
    ]),
    'M384.9 373.8h0M.5-2h0',
  );
  assert.equal(foliaD([{ from: [418, 300], control: [505, 311.26], to: [600, 292] }]), 'M418 300Q505 311.3 600 292');
});

test('nucleiGroups sorts every nucleus into a band, a drift group, and a size', () => {
  for (const nuclei of [...brain.lobes.map((lobe) => lobe.nuclei), brain.stemNuclei]) {
    const groups = nucleiGroups(nuclei);
    assert.deepEqual(
      groups.map((group) => [group.band, group.group]),
      [
        [0, 0],
        [0, 1],
        [1, 0],
        [1, 1],
        [2, 0],
        [2, 1],
      ],
    );
    let drawn = 0;
    for (const group of groups) {
      assert.equal(group.delay, nuclei.delays[group.band * 2 + group.group]);
      for (const size of group.sizes) {
        assert.ok(size.diameter >= 1.2 && size.diameter <= 2.4, `${size.diameter}`);
        drawn += size.d.split('M').length - 1;
      }
      assert.ok(group.sizes.length <= 7);
    }
    assert.equal(drawn, nuclei.dots.length);
  }
});
