// Tests for the brain navigation's rules. Run from the repo root:
//   node --test tests/brain-nav.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { REACH, nearestCell, pulseMs, slideLabel, tapAction } from '../src/lib/brain-nav.ts';
import type { Box, LabelFit } from '../src/lib/brain-nav.ts';

// --space-2xs and --space-xs, as Brain.astro's script reads them.
const INSET = 8;
const CLEARANCE = 12;

// The hero at an 800px window, as measured: the name, then the two sentences.
const TEXT: Box[] = [
  { left: 40, top: 300, right: 296, bottom: 348 },
  { left: 40, top: 364, right: 330, bottom: 390 },
  { left: 40, top: 390, right: 385, bottom: 416 },
];

const fit = (box: Box, side: 'left' | 'right', more: Partial<LabelFit> = {}): LabelFit => ({
  box,
  side,
  viewportRight: 800,
  inset: INSET,
  text: TEXT,
  clearance: CLEARANCE,
  ...more,
});

test('a label with room stays where its callout puts it', () => {
  assert.equal(slideLabel(fit({ left: 500, top: 100, right: 630, bottom: 148 }, 'right')), 0);
  assert.equal(slideLabel(fit({ left: 420, top: 360, right: 560, bottom: 408 }, 'left')), 0);
});

test('a label running right slides left to stay inside the viewport', () => {
  const box = { left: 704, top: 220, right: 834, bottom: 268 };
  const slide = slideLabel(fit(box, 'right'));
  assert.equal(slide, -42);
  assert.equal(box.right + slide, 800 - INSET);
});

test('a label running left slides right, clear of the line it would crowd', () => {
  // Level with the second sentence, and starting 16px short of its end.
  const box = { left: 369, top: 360, right: 516, bottom: 408 };
  const slide = slideLabel(fit(box, 'left'));
  assert.equal(slide, 385 + CLEARANCE - 369);
  assert.ok(box.left + slide >= 385 + CLEARANCE);
});

test('text above or below a label does not move it', () => {
  // Over the name's column, but 36px above the name: the About label.
  assert.equal(slideLabel(fit({ left: 244, top: 216, right: 474, bottom: 264 }, 'left')), 0);
  // Under the last sentence.
  assert.equal(slideLabel(fit({ left: 244, top: 428, right: 474, bottom: 476 }, 'left')), 0);
  // Nearer than the clearance does.
  assert.ok(slideLabel(fit({ left: 244, top: 245, right: 474, bottom: 293 }, 'left')) > 0);
});

test('only the lines a label is level with count', () => {
  // Level with the first sentence, which ends at 330, not the second at 385.
  const slide = slideLabel(fit({ left: 320, top: 318, right: 467, bottom: 366 }, 'left', { text: TEXT.slice(0, 2) }));
  assert.equal(slide, 330 + CLEARANCE - 320);
});

test("the callout's tip stays on the shelf", () => {
  // Far past the edge: it slides its whole width and no further.
  assert.equal(slideLabel(fit({ left: 900, top: 100, right: 1030, bottom: 148 }, 'right')), -130);
  // Deep in the text: the same, the other way.
  assert.equal(slideLabel(fit({ left: 100, top: 360, right: 200, bottom: 408 }, 'left')), 100);
  // A label never slides away from the side it runs to.
  assert.ok(slideLabel(fit({ left: 500, top: 100, right: 630, bottom: 148 }, 'right')) <= 0);
  assert.ok(slideLabel(fit({ left: 420, top: 360, right: 560, bottom: 408 }, 'left')) >= 0);
});

test('where the text and the viewport both press, the viewport wins', () => {
  const box = { left: 300, top: 360, right: 390, bottom: 408 };
  const slide = slideLabel(fit(box, 'left', { viewportRight: 440 }));
  assert.equal(box.right + slide, 440 - INSET);
});

test('the pulse runs at the signal speed, between its shortest and longest times', () => {
  // --signal-backprop, --brain-pulse-min, --brain-pulse-max.
  const [speed, min, max] = [0.55, 180, 420];
  assert.equal(pulseMs(151.4, 0.96, speed, min, max), Math.round((151.4 * 0.96) / 0.55));
  assert.equal(pulseMs(111.3, 0.38, speed, min, max), min);
  assert.equal(pulseMs(172.8, 1.6, speed, min, max), max);
  for (const scale of [0.3, 0.5, 0.96, 2]) {
    const ms = pulseMs(154, scale, speed, min, max);
    assert.ok(ms >= min && ms <= max);
  }
});

test('the nearest cell within reach fires; one out of reach does not', () => {
  const cells = [
    { x: 100, y: 100 },
    { x: 140, y: 100 },
    { x: 400, y: 300 },
  ];
  assert.equal(nearestCell(cells, 105, 102), 0);
  assert.equal(nearestCell(cells, 128, 100), 1);
  assert.equal(nearestCell(cells, 400 + REACH - 1, 300), 2);
  assert.equal(nearestCell(cells, 400 + REACH, 300), -1);
  assert.equal(nearestCell(cells, 250, 200), -1);
  assert.equal(nearestCell([], 0, 0), -1);
});

test('a first tap previews, and the second goes', () => {
  const finger = { pointerType: 'touch', width: 23, height: 23 };
  assert.equal(tapAction(finger, 1, false), 'preview');
  assert.equal(tapAction(finger, 1, true), 'go');
  assert.equal(tapAction({ pointerType: 'pen', width: 1, height: 1 }, 1, false), 'preview');
});

test('a mouse, a keyboard, and a screen reader go straight to the section', () => {
  assert.equal(tapAction({ pointerType: 'mouse', width: 1, height: 1 }, 1, false), 'go');
  // Enter on a focused lobe: a click with no press before it, counting none.
  assert.equal(tapAction(null, 0, false), 'go');
  // A screen reader's activation: a press with no size, or a click that counts no press.
  assert.equal(tapAction({ pointerType: 'touch', width: 0, height: 0 }, 1, false), 'go');
  assert.equal(tapAction({ pointerType: 'touch', width: 23, height: 23 }, 0, false), 'go');
  // TalkBack's, as Chrome reports it: a 1px mouse press.
  assert.equal(tapAction({ pointerType: 'mouse', width: 1, height: 1 }, 0, false), 'go');
  // A click with no press on this lobe at all.
  assert.equal(tapAction(null, 1, false), 'go');
});
