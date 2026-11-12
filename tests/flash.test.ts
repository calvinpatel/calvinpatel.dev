// Tests for the flash an axon node, a raster spike, and a Contact node share.
// Run from the repo root:
//   node --test tests/flash.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { flash } from '../src/lib/flash.ts';
import type { FlashTokens } from '../src/lib/flash.ts';

// --ink-rest, --flash-in, --flash-out, --hop, and --ease-travel, as flasher()
// reads them.
const TOKENS: FlashTokens = { rest: 0.45, rise: 120, fall: 400, hop: 130, rate: 'linear' };

test('a flash rises from rest to full over --flash-in and falls back over --flash-out, at a steady rate', () => {
  const { keyframes, timing } = flash(TOKENS, 3);
  assert.deepEqual(keyframes, [{ fillOpacity: 0.45 }, { fillOpacity: 1, offset: 120 / 520 }, { fillOpacity: 0.45 }]);
  assert.equal(timing.duration, 520);
  assert.equal(timing.easing, 'linear');
  // It starts three hops from now, and a flash with no hops starts at once.
  assert.equal(timing.delay, 390);
  assert.equal(flash(TOKENS).timing.delay, 0);
  // It never fills, so the part is at its stylesheet's rest before and after.
  assert.equal(timing.fill, undefined);
});
