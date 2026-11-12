// Tests for how a cell of the hero's neuron layer takes input and fires. Run
// from the repo root:
//   node --test tests/neuron-signal.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  SIGNAL,
  brighten,
  chargeAt,
  deliver,
  firingLength,
  flashAt,
  inputWave,
  isQuiet,
  restingMembrane,
  somaGlow,
  spike,
  spikeWave,
  touchSoma,
} from '../src/lib/neuron-signal.ts';
import type { Arbor, Timing } from '../src/lib/neuron-signal.ts';

// The tokens, as NeuronLayer.astro's script reads them.
const TIMING: Timing = {
  dendrite: 0.32,
  backprop: 0.55,
  tau: 260,
  threshold: 1,
  refractory: 420,
  rise: 24,
  inputFade: 70,
  backpropFade: 200,
  flash: 220,
};

// One straight dendrite, a point every 8px out to 320px. Point 0 is the soma.
const ARBOR: Arbor = {
  count: 41,
  dist: Float32Array.from({ length: 41 }, (_, i) => i * 8),
  farthest: 320,
};
// The path from a point back to the soma.
const pathFrom = (point: number) => Int32Array.from({ length: point + 1 }, (_, k) => point - k);

const brightness = (waves: Parameters<typeof brighten>[0][], now: number) => {
  const bright = new Float32Array(ARBOR.count);
  for (const wave of waves) brighten(wave, ARBOR, now, TIMING, bright);
  return bright;
};
const brightest = (bright: Float32Array) => bright.indexOf(Math.max(...bright));

test('an input travels to the soma at the dendrite speed, as a short burst', () => {
  const wave = inputWave(0, ARBOR, pathFrom(20), 1000, TIMING, false);
  assert.equal(wave.from, 160);
  assert.equal(wave.arrives, 1000 + 160 / TIMING.dendrite);

  // Just after it starts, only where it was touched is lit.
  const start = brightness([wave], 1000 + TIMING.rise);
  assert.equal(brightest(start), 20);
  assert.equal(start[10], 0);
  assert.equal(start[21], 0); // nothing lights beyond the touch, away from the soma

  // Halfway there, the bright point is halfway in, and the start has faded.
  const halfway = brightness([wave], 1000 + 80 / TIMING.dendrite + TIMING.rise);
  assert.equal(brightest(halfway), 10);
  assert.ok(halfway[20] < halfway[10] / 10);
  assert.equal(halfway[2], 0);

  // After its end nothing is lit.
  assert.ok(brightness([wave], wave.end + 1).every((value) => value === 0));
  assert.ok(wave.end > wave.arrives);
});

test('less charge arrives from further out, and never enough to fire alone', () => {
  const near = inputWave(0, ARBOR, pathFrom(3), 0, TIMING, false);
  const far = inputWave(0, ARBOR, pathFrom(40), 0, TIMING, false);
  assert.ok(near.charge > far.charge);
  assert.ok(near.charge < TIMING.threshold);
  assert.ok(far.charge > 0);
});

test('every input counts, however soon after the last', () => {
  // Three branches crossed within a few ms: three inputs, and their charges add up at the soma.
  const membrane = restingMembrane();
  const waves = [0, 5, 10].map((at) => inputWave(0, ARBOR, pathFrom(3), at, TIMING, false));
  assert.equal(new Set(waves.map((wave) => wave.arrives)).size, 3);
  const fired = waves.map((wave) => deliver(membrane, wave.charge, wave.arrives, TIMING));
  assert.deepEqual(fired, [false, true, false]);
});

test('an input that carries further delivers more charge, and lights more of its path', () => {
  const short = inputWave(0, ARBOR, pathFrom(40), 0, TIMING, false);
  const long = inputWave(0, ARBOR, pathFrom(40), 0, TIMING, false, 1.1);
  assert.equal(short.length, ARBOR.farthest * SIGNAL.input.length);
  assert.ok(Math.abs(short.charge - Math.exp(-1 / SIGNAL.input.length)) < 1e-9);
  assert.ok(Math.abs(long.charge - Math.exp(-1 / 1.1)) < 1e-9);
  assert.ok(long.charge > short.charge && long.length > short.length);
  // When it arrives is the same: only how much of it does.
  assert.equal(long.arrives, short.arrives);
});

test('the soma sums its inputs, which leak away, and fires at the threshold', () => {
  const membrane = restingMembrane();
  assert.equal(deliver(membrane, 0.6, 1000, TIMING), false);
  assert.ok(Math.abs(chargeAt(membrane, 1000 + TIMING.tau, TIMING) - 0.6 / Math.E) < 1e-9);

  // A second input soon after reaches the threshold.
  assert.equal(deliver(membrane, 0.6, 1100, TIMING), true);
  assert.equal(membrane.lastSpike, 1100);
  assert.equal(chargeAt(membrane, 1100, TIMING), 0);

  // Two inputs far apart don't.
  const slow = restingMembrane();
  deliver(slow, 0.6, 1000, TIMING);
  assert.equal(deliver(slow, 0.6, 1000 + 4 * TIMING.tau, TIMING), false);
});

test('touching the soma fires the cell at once, whatever its charge', () => {
  const membrane = restingMembrane();
  deliver(membrane, 0.3, 490, TIMING);
  assert.equal(touchSoma(membrane, 500, TIMING), true);
  assert.equal(membrane.lastSpike, 500);
  assert.equal(membrane.gain, 1);
});

test("a cell can't fire again until its refractory time is over", () => {
  const membrane = restingMembrane();
  assert.equal(touchSoma(membrane, 1000, TIMING), true);
  assert.equal(touchSoma(membrane, 1000 + TIMING.refractory, TIMING), false);
  assert.equal(deliver(membrane, 1.5, 1000 + TIMING.refractory, TIMING), false);
  assert.equal(membrane.lastSpike, 1000);
  assert.equal(touchSoma(membrane, 1000 + TIMING.refractory + 1, TIMING), true);
});

test("touches on a refractory soma don't build up charge", () => {
  const membrane = restingMembrane();
  touchSoma(membrane, 1000, TIMING);
  for (let at = 1010; at < 1400; at += 10) touchSoma(membrane, at, TIMING);
  assert.equal(chargeAt(membrane, 1400, TIMING), 0);
});

test('a spike spreads out through the dendrites and fades outward from the soma', () => {
  const wave = spikeWave(0, ARBOR, 2000, 1, TIMING, false);
  assert.equal(wave.points, null);

  // The front is where the back-propagation speed puts it.
  const early = brightness([wave], 2000 + 80 / TIMING.backprop + TIMING.rise);
  assert.equal(brightest(early), 10);
  assert.equal(early[30], 0);
  assert.equal(early[0], 0); // the soma is drawn by its glow, not as a point

  // Later the front is further out and what's behind it has dimmed: the fade moves outward too.
  const later = brightness([wave], 2000 + 240 / TIMING.backprop + TIMING.rise);
  assert.equal(brightest(later), 30);
  assert.ok(later[10] < early[10]);
  assert.ok(later[10] < later[20] && later[20] < later[30]);

  // It reaches the tips, and is over when it says.
  const atTips = brightness([wave], 2000 + 320 / TIMING.backprop + TIMING.rise);
  assert.ok(atTips[40] >= SIGNAL.spike.strength * SIGNAL.spike.floor - 1e-6);
  assert.equal(wave.end, 2000 + firingLength(ARBOR, TIMING));
  assert.ok(brightness([wave], wave.end + 1).every((value) => value === 0));
  assert.ok(brightness([wave], wave.end - 150).some((value) => value > 0));
});

test('a cell firing on its own fires at half strength', () => {
  const full = brightness([spikeWave(0, ARBOR, 0, 1, TIMING, false)], 100);
  const own = brightness([spikeWave(0, ARBOR, 0, SIGNAL.own, TIMING, false)], 100);
  const front = brightest(full);
  assert.ok(Math.abs(own[front] - full[front] * SIGNAL.own) < 1e-6);
});

test('where two signals cross, the brighter one shows', () => {
  const input = inputWave(0, ARBOR, pathFrom(20), 0, TIMING, false);
  const back = spikeWave(0, ARBOR, 0, 1, TIMING, false);
  const now = TIMING.rise;
  const both = brightness([input, back], now);
  const alone = [brightness([input], now), brightness([back], now)];
  for (let i = 0; i < ARBOR.count; i++) assert.equal(both[i], Math.max(alone[0][i], alone[1][i]));
});

test("the soma's glow ripples outward as it fades", () => {
  const membrane = restingMembrane();
  assert.equal(somaGlow(membrane, 0, TIMING, false), null);

  spike(membrane, 1000, 1);
  const first = somaGlow(membrane, 1000, TIMING, false)!;
  assert.ok(Math.abs(first.alpha - SIGNAL.glow.peak) < 1e-9);
  assert.equal(first.radius, SIGNAL.glow.near);
  const later = somaGlow(membrane, 1000 + TIMING.flash, TIMING, false)!;
  assert.ok(later.alpha < first.alpha && later.radius > first.radius);
  assert.ok(later.radius <= SIGNAL.glow.near + SIGNAL.glow.spread);
  assert.equal(flashAt(membrane, 1000 + TIMING.flash, TIMING), 1 / Math.E);
  // It is gone well inside one firing.
  assert.equal(somaGlow(membrane, 1000 + 5 * TIMING.flash, TIMING, false), null);
  assert.ok(5 * TIMING.flash < firingLength(ARBOR, TIMING));
});

test('charge short of the threshold glows faintly and does not spread', () => {
  const membrane = restingMembrane();
  deliver(membrane, 0.6, 1000, TIMING);
  const glow = somaGlow(membrane, 1000, TIMING, false)!;
  assert.ok(Math.abs(glow.alpha - 0.6 * SIGNAL.glow.charge * SIGNAL.glow.peak) < 1e-9);
  assert.equal(glow.radius, SIGNAL.glow.near);
  assert.equal(somaGlow(membrane, 1000 + 10 * TIMING.tau, TIMING, false), null);
});

test('with reduced motion a signal lights its whole path at once and fades in place', () => {
  const input = inputWave(0, ARBOR, pathFrom(20), 1000, TIMING, true);
  assert.equal(input.arrives, 1000);
  const lit = brightness([input], 1000 + TIMING.rise);
  for (let i = 1; i <= 20; i++) assert.ok(lit[i] > 0);
  assert.equal(lit[21], 0);
  // Every point is at the same moment of its fade: nothing travels.
  const faded = brightness([input], 1000 + TIMING.rise + TIMING.inputFade);
  for (let i = 1; i <= 20; i++) assert.ok(Math.abs(faded[i] / lit[i] - 1 / Math.E) < 1e-6);

  const back = spikeWave(0, ARBOR, 2000, 1, TIMING, true);
  const all = brightness([back], 2000 + TIMING.rise);
  for (let i = 1; i < ARBOR.count; i++) assert.ok(all[i] > 0);
  assert.equal(back.end, 2000 + firingLength(ARBOR, TIMING, true));
  assert.ok(firingLength(ARBOR, TIMING, true) < firingLength(ARBOR, TIMING));

  // The glow fades without spreading.
  const membrane = restingMembrane();
  spike(membrane, 1000, 1);
  assert.equal(somaGlow(membrane, 1000 + TIMING.flash, TIMING, true)!.radius, SIGNAL.glow.near);
});

test('one firing takes the time to cross the cell and fade', () => {
  assert.equal(firingLength(ARBOR, TIMING), 320 / 0.55 + 24 + 5 * 200);
});

test('a cell fires on its own only after a quiet spell', () => {
  const membrane = restingMembrane();
  assert.ok(isQuiet(membrane, 0, 1500));
  spike(membrane, 1000, SIGNAL.own);
  assert.ok(!isQuiet(membrane, 2500, 1500));
  assert.ok(isQuiet(membrane, 2501, 1500));
});
