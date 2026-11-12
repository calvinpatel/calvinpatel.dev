// Tests for the rules that play a section drawing once. Run from the repo root:
//   node --test tests/play-once.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { animated, createTrigger } from '../src/lib/play-once.ts';
import type { Surroundings } from '../src/lib/play-once.ts';

// A drawing below the fold in a visible tab, as playOnce first finds one.
const BELOW: Surroundings = { inView: false, onScreen: false, tabVisible: true, reducedMotion: false };
const FULLY = { onScreen: true, inView: true };
const PARTLY = { onScreen: true, inView: false };
const OFF = { onScreen: false, inView: false };

/** A trigger whose drawing has just started playing. */
function playing() {
  const trigger = createTrigger(BELOW);
  assert.equal(trigger.update(FULLY), 'play');
  return trigger;
}

test('a drawing waits until it is fully in view, then plays', () => {
  const trigger = createTrigger(BELOW);
  assert.equal(trigger.update({}), null);
  assert.equal(trigger.update(PARTLY), null);
  assert.equal(trigger.phase(), 'waiting');
  assert.equal(trigger.update(FULLY), 'play');
  assert.equal(trigger.phase(), 'playing');
});

test('a drawing that has finished never plays again', () => {
  const trigger = playing();
  trigger.finished();
  assert.equal(trigger.phase(), 'played');
  assert.equal(trigger.update(OFF), null);
  assert.equal(trigger.update(FULLY), null);
  assert.equal(trigger.update({ tabVisible: false }), null);
  assert.equal(trigger.update({ tabVisible: true }), null);
  assert.equal(trigger.resized(), null);
  assert.equal(trigger.phase(), 'played');
});

test('partly off screen it keeps playing; fully off screen it holds, and resumes when back', () => {
  const trigger = playing();
  assert.equal(trigger.update(PARTLY), null);
  assert.equal(trigger.phase(), 'playing');
  assert.equal(trigger.update(OFF), 'hold');
  assert.equal(trigger.phase(), 'held');
  // Any part of it back on screen is enough to carry on.
  assert.equal(trigger.update(PARTLY), 'resume');
  assert.equal(trigger.phase(), 'playing');
  trigger.finished();
  assert.equal(trigger.phase(), 'played');
});

test('a hidden tab holds it, and it resumes when the tab shows', () => {
  const trigger = playing();
  assert.equal(trigger.update({ tabVisible: false }), 'hold');
  assert.equal(trigger.update({ tabVisible: true }), 'resume');
});

test('held for both reasons, it resumes only when both have cleared', () => {
  const trigger = playing();
  assert.equal(trigger.update(OFF), 'hold');
  assert.equal(trigger.update({ tabVisible: false }), null);
  assert.equal(trigger.update(FULLY), null);
  assert.equal(trigger.phase(), 'held');
  assert.equal(trigger.update({ tabVisible: true }), 'resume');
});

test('a held drawing is not finished by a stray report', () => {
  const trigger = playing();
  trigger.update(OFF);
  trigger.finished();
  assert.equal(trigger.phase(), 'held');
});

test("a drawing doesn't start in a hidden tab; it starts when the tab shows", () => {
  const trigger = createTrigger({ ...BELOW, tabVisible: false });
  assert.equal(trigger.update(FULLY), null);
  assert.equal(trigger.phase(), 'waiting');
  assert.equal(trigger.update({ tabVisible: true }), 'play');
});

test("a drawing with its own rule still has to be on screen to start", () => {
  const trigger = createTrigger(BELOW);
  assert.equal(trigger.update({ inView: true }), null);
  assert.equal(trigger.update({ onScreen: true }), 'play');
});

test('a resize mid-play sends it to rest, and it counts as played', () => {
  const trigger = playing();
  assert.equal(trigger.resized(), 'rest');
  assert.equal(trigger.phase(), 'played');
  assert.equal(trigger.update(OFF), null);
  assert.equal(trigger.update(FULLY), null);
});

test('a resize while it is held sends it to rest too', () => {
  const trigger = playing();
  trigger.update(OFF);
  assert.equal(trigger.resized(), 'rest');
  assert.equal(trigger.phase(), 'played');
  assert.equal(trigger.update(FULLY), null);
});

test('a resize before it has played changes nothing', () => {
  const trigger = createTrigger(BELOW);
  assert.equal(trigger.resized(), null);
  assert.equal(trigger.phase(), 'waiting');
  assert.equal(trigger.update(FULLY), 'play');
});

test('with reduced motion on it never plays, and coming into view counts as played', () => {
  const trigger = createTrigger({ ...BELOW, reducedMotion: true });
  assert.equal(trigger.update(PARTLY), null);
  assert.equal(trigger.phase(), 'waiting');
  assert.equal(trigger.update(FULLY), null);
  assert.equal(trigger.phase(), 'played');
  assert.equal(trigger.update({ reducedMotion: false }), null);
  assert.equal(trigger.update(OFF), null);
  assert.equal(trigger.update(FULLY), null);
});

test('a drawing not yet seen plays once reduced motion is switched off', () => {
  const trigger = createTrigger({ ...BELOW, reducedMotion: true });
  assert.equal(trigger.update({ reducedMotion: false }), null);
  assert.equal(trigger.update(FULLY), 'play');
});

test('reduced motion switched on mid-play sends it to rest', () => {
  const trigger = playing();
  assert.equal(trigger.update({ reducedMotion: true }), 'rest');
  assert.equal(trigger.phase(), 'played');

  const held = playing();
  held.update(OFF);
  assert.equal(held.update({ reducedMotion: true }), 'rest');
  assert.equal(held.phase(), 'played');
});

// A stand-in for a Web Animation: what animated() uses of one.
function standIn() {
  const calls: string[] = [];
  let settle!: { resolve: (value?: unknown) => void; reject: (reason: unknown) => void };
  const animation = {
    calls,
    playState: 'running',
    finished: new Promise<unknown>((resolve, reject) => (settle = { resolve, reject })),
    pause() {
      calls.push('pause');
      animation.playState = 'paused';
    },
    play() {
      calls.push('play');
      animation.playState = 'running';
    },
    cancel() {
      calls.push('cancel');
      animation.playState = 'idle';
      settle.reject(new DOMException('The user aborted a request.', 'AbortError'));
    },
    end() {
      animation.playState = 'finished';
      settle.resolve();
    },
  };
  return animation;
}

const turn = () => new Promise((resolve) => setImmediate(resolve));

test('a drawing of animations has finished when all of them have', async () => {
  const [first, second] = [standIn(), standIn()];
  let finished = 0;
  animated(() => [first, second]).play(() => finished++);
  first.end();
  await turn();
  assert.equal(finished, 0);
  second.end();
  await turn();
  assert.equal(finished, 1);
});

test('a drawing with nothing to animate has finished at once', async () => {
  let finished = 0;
  animated(() => []).play(() => finished++);
  await turn();
  assert.equal(finished, 1);
});

test('hold and resume leave an animation that has ended alone', async () => {
  const [ended, running] = [standIn(), standIn()];
  const drawing = animated(() => [ended, running]);
  drawing.play(() => {});
  ended.end();
  drawing.hold();
  drawing.resume();
  assert.deepEqual(ended.calls, []);
  assert.deepEqual(running.calls, ['pause', 'play']);
});

test('rest cancels the animations, which is not an error and not a finish', async () => {
  const unhandled: unknown[] = [];
  const note = (reason: unknown) => unhandled.push(reason);
  process.on('unhandledRejection', note);
  try {
    const [first, second] = [standIn(), standIn()];
    const drawing = animated(() => [first, second]);
    let finished = 0;
    drawing.play(() => finished++);
    drawing.hold();
    drawing.rest();
    await turn();
    await turn();
    assert.deepEqual(first.calls, ['pause', 'cancel']);
    assert.deepEqual(second.calls, ['pause', 'cancel']);
    assert.equal(finished, 0);
    assert.deepEqual(unhandled, []);
  } finally {
    process.off('unhandledRejection', note);
  }
});
