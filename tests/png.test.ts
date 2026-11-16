// Tests for the PNG size reader. Run from the repo root:
//   node --test tests/png.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { pngSize } from '../src/lib/png.ts';

/** The first 24 bytes of a PNG of the given size. */
function header(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

test("a PNG's size is read from its header", () => {
  assert.deepEqual(pngSize(header(1200, 630)), { width: 1200, height: 630 });
  assert.deepEqual(pngSize(header(1, 70000)), { width: 1, height: 70000 });
});

test('a view into a larger buffer reads its own bytes', () => {
  const padded = new Uint8Array(40);
  padded.set(header(180, 180), 16);
  assert.deepEqual(pngSize(padded.subarray(16)), { width: 180, height: 180 });
});

test("a file that isn't a PNG is an error, not a wrong size", () => {
  assert.throws(() => pngSize(new Uint8Array(24)), /isn't a PNG/);
  assert.throws(() => pngSize(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>')), /isn't a PNG/);
  assert.throws(() => pngSize(header(10, 10).subarray(0, 20)), /isn't a PNG/);
});

test('the link preview is the size its tags will say', () => {
  const picture = readFileSync(new URL('../public/link-preview.png', import.meta.url));
  assert.deepEqual(pngSize(picture), { width: 1200, height: 630 });
});
