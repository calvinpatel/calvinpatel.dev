// Tests for the Experience raster's sweep: the cursor's travel and fades, and
// when it reaches each spike. Run from the repo root:
//   node --test tests/sweep.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { arrivals, cursor } from '../src/lib/sweep.ts';
import type { SweepTokens } from '../src/lib/sweep.ts';

// --sweep, --flash-in, --sweep-cursor, --ease-travel, and --ease-out, as
// Raster.astro's script reads them.
const TOKENS: SweepTokens = { sweep: 2700, fade: 120, strength: 0.7, rate: 'linear', ease: 'cubic-bezier(0.2, 0.8, 0.2, 1)' };

test('the cursor reaches a spike after its share of the row, of --sweep', () => {
  // The left end as the sweep starts, the middle halfway, the right end as it ends.
  assert.deepEqual(arrivals([0, 596, 1192], 1192, 2700), [0, 1350, 2700]);
  // A narrower row is crossed in the same time, so the same spike is reached later.
  assert.deepEqual(arrivals([33.5], 335, 2700), [270]);
  assert.deepEqual(arrivals([], 1192, 2700), []);
});

test('the cursor travels the row over --sweep at a steady rate, then stays at the right end', () => {
  const { keyframes, timing } = cursor(TOKENS, 1192).travel;
  assert.deepEqual(keyframes, [{ x: '0px', easing: 'linear' }, { x: '1192px', offset: 2700 / 2820 }, { x: '1192px' }]);
  // The sweep, and the fade out after it.
  assert.equal(timing.duration, 2820);
});

test('the cursor fades in over --flash-in as it starts, and out over --flash-in once it has arrived', () => {
  const { keyframes, timing } = cursor(TOKENS, 1192).fade;
  assert.deepEqual(keyframes, [
    { fillOpacity: 0, easing: TOKENS.ease },
    { fillOpacity: 0.7, offset: 120 / 2820 },
    { fillOpacity: 0.7, offset: 2700 / 2820, easing: TOKENS.ease },
    { fillOpacity: 0 },
  ]);
  assert.equal(timing.duration, 2820);
});

test('neither of the cursor’s animations fills or waits, so they start together and leave it at rest', () => {
  const { travel, fade } = cursor(TOKENS, 335);
  for (const { timing } of [travel, fade]) {
    assert.equal(timing.fill, undefined);
    assert.equal(timing.delay, undefined);
    // Each stretch has its own easing, so the whole runs straight through.
    assert.equal(timing.easing, undefined);
  }
});
