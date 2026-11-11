// Tests for the neuron layer's brightness cap. Run from the repo root:
//   node --test tests/neuron-zones.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Box } from '../src/lib/brain-nav.ts';
import { REST_MAX } from '../src/lib/neuron-field.ts';
import { ZONE, capGray, coverage, coverageMask, luminance, sameZones, veils } from '../src/lib/neuron-zones.ts';

// --canvas-cap-luminance and --canvas-cap-brain, as NeuronLayer.astro's script reads them.
const CAP = 0.053;
const BRAIN = 0.0013;

// The hero's name at a 1440px window, about, and a label up and to its right.
const NAME: Box = { left: 124, top: 390, right: 512, bottom: 470 };
const LABEL: Box = { left: 700, top: 240, right: 860, bottom: 284 };

test('luminance is the WCAG formula', () => {
  assert.equal(luminance(0, 0, 0), 0);
  assert.ok(Math.abs(luminance(255, 255, 255) - 1) < 1e-12);
  // DESIGN.md: the cap is about #404040.
  assert.ok(Math.abs(luminance(0x40, 0x40, 0x40) - 0.0513) < 0.0001);
  // Green counts most and blue least.
  assert.ok(luminance(0, 100, 0) > luminance(100, 0, 0));
  assert.ok(luminance(100, 0, 0) > luminance(0, 0, 100));
});

test("the cap's gray leaves room for the brain and for one rounding step", () => {
  const gray = capGray(CAP, BRAIN);
  assert.equal(gray, 63);
  assert.ok(luminance(gray, gray, gray) + BRAIN <= CAP);
  // One step up, as a browser's rounding might give, still holds.
  assert.ok(luminance(gray + 1, gray + 1, gray + 1) + BRAIN <= CAP);
  // Two steps up would not: the gray is as bright as the cap allows.
  assert.ok(luminance(gray + 2, gray + 2, gray + 2) + BRAIN > CAP);
});

test('a pixel held under the gray on every channel is under the cap, whatever its color', () => {
  const gray = capGray(CAP, BRAIN);
  for (const [r, g, b] of [
    [255, 255, 255], // every channel overflowing: cells overlapping
    [255, 90, 74], // tdTomato at full strength
    [68, 224, 124], // GFP
    [79, 109, 255], // DAPI
  ]) {
    const held = [r, g, b].map((channel) => Math.min(channel, gray));
    assert.ok(luminance(held[0], held[1], held[2]) + BRAIN <= CAP);
  }
});

test('the veils split the gray between a resting cell and a signal', () => {
  const gray = capGray(CAP, BRAIN);
  const { rest, signal } = veils(gray, REST_MAX);
  // The brightest resting line, a channel at full, dimmed; plus a full signal, dimmed.
  const resting = 255 * REST_MAX * rest;
  const firing = 255 * signal;
  assert.ok(Math.abs(resting - gray / 2) < 1e-9);
  assert.ok(Math.abs(firing - gray / 2) < 1e-9);
  assert.ok(resting + firing <= gray);
  // A layer that rests dimmer than half the gray isn't brightened.
  assert.equal(veils(gray, 0.05).rest, 1);
});

test('coverage is full over a zone and its pad, and fades out past the feather', () => {
  const zones = [NAME];
  assert.equal(coverage(zones, 300, 430), 1);
  assert.equal(coverage(zones, NAME.left, NAME.top), 1);
  assert.equal(coverage(zones, NAME.right + ZONE.pad, 430), 1);
  assert.equal(coverage(zones, NAME.right + ZONE.pad + ZONE.feather, 430), 0);
  assert.equal(coverage(zones, 1000, 100), 0);
  assert.equal(coverage([], 300, 430), 0);
  // Halfway out, halfway dimmed.
  assert.ok(Math.abs(coverage(zones, NAME.right + ZONE.pad + ZONE.feather / 2, 430) - 0.5) < 1e-9);
});

test('coverage has no edge: it never jumps from one px to the next', () => {
  const zones = [NAME, LABEL];
  let before = coverage(zones, 0, 400);
  for (let x = 1; x <= 1000; x++) {
    const here = coverage(zones, x, 400);
    assert.ok(Math.abs(here - before) < 0.05, `a jump at x = ${x}`);
    before = here;
  }
  // A corner is rounded: as far out diagonally as straight.
  const out = (ZONE.pad + ZONE.feather / 2) / Math.SQRT2;
  assert.ok(Math.abs(coverage(zones, NAME.right + out, NAME.bottom + out) - 0.5) < 1e-9);
});

// The mask's alpha where a canvas px samples it, mixing the nearest `taps`
// mask pixels each way on each axis with the weights that favor the darkest:
// the least alpha a browser's smoothing could give.
function leastAlpha(mask: ReturnType<typeof coverageMask>, x: number, y: number, taps: number): number {
  const column = Math.floor(x / ZONE.scale - 0.5) + ZONE.margin;
  const row = Math.floor(y / ZONE.scale - 0.5) + ZONE.margin;
  let least = 255;
  for (let r = row - taps + 1; r <= row + taps; r++) {
    for (let c = column - taps + 1; c <= column + taps; c++) {
      const inside = r >= 0 && r < mask.rows && c >= 0 && c < mask.columns;
      least = Math.min(least, inside ? mask.alpha[r * mask.columns + c] : 0);
    }
  }
  return least;
}

test("the mask is fully opaque over every px of a zone, however it's smoothed", () => {
  const [width, height] = [1440, 900];
  // Zones at the canvas's corner and edges, and off whole px.
  const zones: Box[] = [
    NAME,
    LABEL,
    { left: 0, top: 0, right: 44, bottom: 44 },
    { left: 1361.5, top: 8.25, right: 1440, bottom: 52.25 },
    { left: 700.3, top: 860.7, right: 1000.9, bottom: 900 },
  ];
  const mask = coverageMask(zones, width, height);
  assert.equal(mask.columns, width / ZONE.scale + 2 * ZONE.margin);
  assert.equal(mask.rows, height / ZONE.scale + 2 * ZONE.margin);
  for (const zone of zones) {
    for (let y = Math.floor(zone.top); y < Math.min(height, zone.bottom); y++) {
      for (let x = Math.floor(zone.left); x < Math.min(width, zone.right); x++) {
        // Two taps each way is a bicubic filter's reach; bilinear takes one.
        assert.equal(leastAlpha(mask, x + 0.5, y + 0.5, 2), 255, `(${x}, ${y})`);
      }
    }
  }
});

test('the mask is clear away from every zone, and partial only in the feather', () => {
  const mask = coverageMask([NAME], 1440, 900);
  const at = (x: number, y: number) =>
    mask.alpha[(Math.floor(y / ZONE.scale) + ZONE.margin) * mask.columns + Math.floor(x / ZONE.scale) + ZONE.margin];
  assert.equal(at(1000, 100), 0);
  assert.equal(at(300, 430), 255);
  const feathered = at(NAME.right + ZONE.pad + ZONE.feather / 2, 430);
  assert.ok(feathered > 0 && feathered < 255);
  assert.equal(coverageMask([], 1440, 900).alpha.some((alpha) => alpha > 0), false);
});

test('zones are compared to the pixel', () => {
  assert.ok(sameZones([NAME, LABEL], [{ ...NAME, left: NAME.left + 0.2 }, LABEL]));
  assert.ok(!sameZones([NAME, LABEL], [{ ...NAME, left: NAME.left + 1 }, LABEL]));
  assert.ok(!sameZones([NAME], [NAME, LABEL]));
  assert.ok(sameZones([], []));
});
