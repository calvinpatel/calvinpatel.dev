// Tests for the five-second window's counting. Run from the repo root:
//   node --test tests/spontaneous.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createCountdown } from '../src/lib/spontaneous.ts';

// --spontaneous-window, as spontaneousWindow() reads it.
const WINDOW = 5000;

test('nothing is counted before the clock starts', () => {
  const countdown = createCountdown(WINDOW);
  assert.equal(countdown.remaining(0), WINDOW);
  assert.equal(countdown.remaining(9000), WINDOW);
});

test('a visible tab counts down to zero and stays there', () => {
  const countdown = createCountdown(WINDOW);
  countdown.resume(100);
  assert.equal(countdown.remaining(100), WINDOW);
  assert.equal(countdown.remaining(1100), 4000);
  assert.equal(countdown.remaining(5100), 0);
  assert.equal(countdown.remaining(60000), 0);
});

test('time in a hidden tab is not counted', () => {
  const countdown = createCountdown(WINDOW);
  countdown.resume(0);
  countdown.pause(2000);
  assert.equal(countdown.remaining(2000), 3000);
  assert.equal(countdown.remaining(50000), 3000);
  countdown.resume(50000);
  assert.equal(countdown.remaining(51000), 2000);
  assert.equal(countdown.remaining(53000), 0);
});

test('a page opened in a background tab gets its whole window later', () => {
  const countdown = createCountdown(WINDOW);
  countdown.pause(0);
  countdown.resume(30000);
  assert.equal(countdown.remaining(30000), WINDOW);
  assert.equal(countdown.remaining(34999), 1);
});

test('resuming twice, or pausing twice, changes nothing', () => {
  const countdown = createCountdown(WINDOW);
  countdown.resume(0);
  countdown.resume(1000);
  assert.equal(countdown.remaining(1500), 3500);
  countdown.pause(2000);
  countdown.pause(4000);
  assert.equal(countdown.remaining(4000), 3000);
});
