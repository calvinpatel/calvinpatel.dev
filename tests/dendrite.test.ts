// Tests for how the About dendrite grows. Run from the repo root:
//   node --test tests/dendrite.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { callAbove, growth, longestStroke, stageEnds } from '../src/lib/dendrite.ts';
import type { Turn } from '../src/lib/dendrite.ts';
import { tokenNumber } from '../src/lib/tokens.ts';

// The growth's tokens, as tokens.css has them.
const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const token = (name: string) => tokenNumber(new RegExp(`${name}:\\s*([^;]+);`).exec(css)![1]);
const TOKENS = { grow: token('--grow'), draw: token('--draw'), stagger: token('--grow-stagger'), fade: token('--fade') };

test('a turning point follows the timeline, in the tokens’ own times', () => {
  const plan = growth({ grow: 600, draw: 450, stagger: 400, fade: 200 });
  assert.deepEqual(plan.stretch, { delay: 0, duration: 600 });
  assert.deepEqual(plan.soma, { delay: 0, duration: 200 });
  assert.deepEqual(plan.branch, { delay: 400, duration: 450 });
  // A dot appears as its branch finishes.
  assert.deepEqual(plan.dots, { delay: 850, duration: 200 });
  assert.equal(plan.gate, 800);
});

test('with all five on screen they start 0, 0.8, 1.6, 2.4, and 3.2s in', () => {
  const { gate } = growth(TOKENS);
  assert.deepEqual(
    [0, 1, 2, 3, 4].map((turn) => turn * gate),
    [0, 800, 1600, 2400, 3200],
  );
});

test('a stretch is over before the one below may start, so the trunk grows one stretch at a time', () => {
  const plan = growth(TOKENS);
  assert.ok(plan.stretch.delay + plan.stretch.duration <= plan.gate);
});

test('each stretch ends at the top of the next paragraph, and the last at the trunk’s end', () => {
  // A trunk from 12px below the first paragraph to 6px below the last.
  const tops = [100, 250.5, 520, 900.25, 1100];
  assert.deepEqual(stageEnds({ top: 112, height: 994 }, tops), [138.5, 408, 788.25, 988, 994]);
});

test('a straight stroke is as long as its line', () => {
  assert.equal(longestStroke('M0 0 L3 4'), 5);
  assert.equal(longestStroke('M8 0 L8 11'), 11);
});

test('a curve is measured along the curve', () => {
  // A curve with its control point on the line is that line.
  assert.ok(Math.abs(longestStroke('M0 0 Q5 0 10 0') - 10) < 1e-9);
  // This one's length has a closed form: √2 + asinh(1).
  assert.ok(Math.abs(longestStroke('M0 0 Q1 0 1 1') - 1.6232252401) < 1e-3);
});

test('a branch is as long as its longest stroke, not all of them together', () => {
  const branch = longestStroke('M20 32 Q13 27 7 18');
  assert.ok(branch > 19 && branch < 20);
  assert.equal(longestStroke('M20 32 Q13 27 7 18 M11 23 L3 24'), branch);
  // The cone's outer prongs are its longest in the margin, and its middle
  // one on a phone.
  assert.equal(longestStroke('M20 4 L13 15 M20 4 L20 17 M20 4 L27 15'), Math.hypot(7, 11));
  assert.equal(longestStroke('M8 0 L4 9 M8 0 L8 11 M8 0 L12 9'), 11);
});

test('a stroke of several pieces counts them all', () => {
  assert.equal(longestStroke('M0 0 L3 4 L3 10'), 11);
  assert.equal(longestStroke('M1.5 .5 L4.5 4.5'), 5);
});

test('path data it can’t read is an error', () => {
  assert.throws(() => longestStroke('M0 0 C1 1 2 2 3 3'), /only M, Q, and L/);
  assert.throws(() => longestStroke('L3 4'), /doesn't start with M/);
  assert.throws(() => longestStroke('M0 0 L3'), /Can't read the path/);
});

// The five turning points, none yet wanted, on screen, started, or finished.
function story(change: Record<number, Partial<Turn>> = {}): Turn[] {
  return [0, 1, 2, 3, 4].map((i) => ({ wanted: false, onScreen: false, started: false, finished: false, ...change[i] }));
}
const DONE = { finished: true, started: true };
const SEEN = { wanted: true, onScreen: true };

test('with none wanted there is nothing to do', () => {
  assert.deepEqual(callAbove(story()), { finish: [], grow: [] });
  assert.deepEqual(callAbove(story({ 1: { onScreen: true } })), { finish: [], grow: [] });
});

test('with nothing unfinished above, nothing changes', () => {
  assert.deepEqual(callAbove(story({ 0: SEEN })), { finish: [], grow: [] });
  assert.deepEqual(callAbove(story({ 0: DONE, 1: DONE, 2: SEEN })), { finish: [], grow: [] });
});

test('all five in view at once: the ones above are on screen, so none finishes at once', () => {
  const call = callAbove(story({ 0: SEEN, 1: SEEN, 2: SEEN, 3: SEEN, 4: SEEN }));
  assert.deepEqual(call, { finish: [], grow: [0, 1, 2, 3] });
});

test('one above that is fully off screen finishes at once; one partly on screen grows first', () => {
  // A reload in the middle of the story: the third box is in view, and the
  // second's stretch ends at it.
  const call = callAbove(story({ 1: { onScreen: true }, 2: SEEN }));
  assert.deepEqual(call, { finish: [0], grow: [1] });
});

test('one held mid-growth and fully off screen finishes at once', () => {
  const call = callAbove(story({ 0: { started: true }, 1: { onScreen: true }, 2: SEEN }));
  assert.deepEqual(call, { finish: [0], grow: [1] });
});

test('one above that is growing on screen is left to grow', () => {
  const call = callAbove(story({ 0: { ...SEEN, started: true }, 1: SEEN }));
  assert.deepEqual(call, { finish: [], grow: [] });
});

test('the lowest wanted one decides', () => {
  // Scrolling up from Projects: the last box comes into view first.
  const call = callAbove(story({ 3: { onScreen: true }, 4: SEEN }));
  assert.deepEqual(call, { finish: [0, 1, 2], grow: [3] });
});

test('one that has started or finished calls on nothing', () => {
  assert.deepEqual(callAbove(story({ 2: { ...SEEN, started: true } })), { finish: [], grow: [] });
  assert.deepEqual(callAbove(story({ 2: { ...SEEN, ...DONE } })), { finish: [], grow: [] });
});

test('one called on to grow calls on those above it in turn', () => {
  // The second was called while on screen and still waits; the first has
  // since left the screen, and no box is in view any more.
  const call = callAbove(story({ 1: SEEN }));
  assert.deepEqual(call, { finish: [0], grow: [] });
});
