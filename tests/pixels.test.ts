// Tests for the pixel-snapping helpers. Run from the repo root:
//   node --test tests/pixels.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { snapDot, toPixelCenter, toPixelEdge } from '../src/lib/pixels.ts';

// Float sums drift by a few 1e-13.
const EPSILON = 1e-9;
const HALF_PIXEL = 0.5;

// Where a drawing can start across the page: on a pixel, half way, or anywhere.
const ORIGINS = [0, 0.5, 116.5, 37.65, 20.3, 1203.125];
const POSITIONS = [0, 0.2, 0.5, 0.75, 30, 149.17, 262.24, 950.024];

// How far a page position is from the nearest whole pixel.
const offEdge = (x: number) => Math.abs(x - Math.round(x));

test('toPixelCenter lands on n + 0.5 across the page, at most half a pixel away', () => {
  for (const origin of ORIGINS) {
    for (const position of POSITIONS) {
      const snapped = toPixelCenter(position, origin);
      assert.ok(offEdge(origin + snapped - 0.5) < EPSILON, `${origin} + ${snapped}`);
      assert.ok(Math.abs(snapped - position) <= HALF_PIXEL + EPSILON);
    }
  }
  assert.equal(toPixelCenter(246.01), 246.5);
  assert.equal(toPixelCenter(246.01, 116.5), 246);
});

test('toPixelEdge lands on a whole pixel across the page, at most half a pixel away', () => {
  for (const origin of ORIGINS) {
    for (const position of POSITIONS) {
      const snapped = toPixelEdge(position, origin);
      assert.ok(offEdge(origin + snapped) < EPSILON, `${origin} + ${snapped}`);
      assert.ok(Math.abs(snapped - position) <= HALF_PIXEL + EPSILON);
    }
  }
  assert.equal(toPixelEdge(262.24), 262);
  assert.equal(toPixelEdge(262.24, 0.5), 262.5);
});

test("snapDot puts both of a dot's edges on pixel edges, at most half a pixel away", () => {
  // The wiring's dot diameters, even and odd.
  for (const diameter of [5, 6, 8, 10, 12]) {
    for (const origin of ORIGINS) {
      for (const position of POSITIONS) {
        const center = snapDot(position, diameter, origin);
        assert.ok(offEdge(origin + center - diameter / 2) < EPSILON, `left edge of ${diameter} at ${origin} + ${center}`);
        assert.ok(offEdge(origin + center + diameter / 2) < EPSILON, `right edge of ${diameter} at ${origin} + ${center}`);
        assert.ok(Math.abs(center - position) <= HALF_PIXEL + EPSILON);
      }
    }
  }
});

test('an even dot centers on a whole pixel and an odd one on a pixel center', () => {
  assert.equal(snapDot(262.24, 6), 262);
  assert.equal(snapDot(262.24, 5), 262.5);
  assert.equal(snapDot(173.95, 5), 173.5);
  assert.equal(snapDot(246.05, 8), 246);
});
