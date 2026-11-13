// Tests for the Contact sequence: each released vesicle's clock, the receptor
// band's and the underline's rise and settle, and when the sequence may start.
// Run from the repo root:
//   node --test tests/contact.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { band, DRIFT, inView, SHOWN, underline, vesicle } from '../src/lib/contact.ts';
import type { ContactTokens, Span } from '../src/lib/contact.ts';

// --hop, the four --contact- times, --flash-in, --ease-out, and the two
// underline colors, as Contact.astro's script reads them.
const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
const TOKENS: ContactTokens = {
  hop: 130,
  release: 350,
  receptor: 800,
  underline: 1000,
  rise: 120,
  settle: 900,
  ease: EASE,
  link: '#67696d',
  text: '#dddfe4',
};

test('the figure’s own numbers are DESIGN.md’s: a 20px drift, shown at 90%', () => {
  assert.equal(DRIFT, 20);
  assert.equal(SHOWN, 0.9);
});

test('the first vesicle releases at --contact-release, arrives at --contact-receptor, and is gone by --contact-underline', () => {
  const { drift, fade } = vesicle(TOKENS, 478, 0);
  for (const { timing } of [drift, fade]) {
    assert.equal(timing.delay, 350);
    // Release to gone: 350ms to 1s.
    assert.equal(timing.duration, 650);
  }
  // It drifts 20px, easing out, by 800ms, and stays there while it fades.
  assert.deepEqual(drift.keyframes, [{ cx: '478px', easing: EASE }, { cx: '498px', offset: 450 / 650 }, { cx: '498px' }]);
  // It appears over --flash-in as it starts to drift, and fades out once it has arrived.
  assert.deepEqual(fade.keyframes, [
    { fillOpacity: 0, easing: EASE },
    { fillOpacity: 0.9, offset: 120 / 650 },
    { fillOpacity: 0.9, offset: 450 / 650, easing: EASE },
    { fillOpacity: 0 },
  ]);
});

test('the second and third vesicles run the same way, one and two --hop later', () => {
  const first = vesicle(TOKENS, 478, 0);
  [1, 2].forEach((k) => {
    const later = vesicle(TOKENS, 478, k);
    assert.equal(later.drift.timing.delay, 350 + k * 130);
    assert.equal(later.fade.timing.delay, 350 + k * 130);
    assert.equal(later.drift.timing.duration, 650);
    assert.deepEqual(later.drift.keyframes, first.drift.keyframes);
    assert.deepEqual(later.fade.keyframes, first.fade.keyframes);
  });
});

test('a vesicle drifts from its own place at rest', () => {
  const { keyframes } = vesicle(TOKENS, 100.5, 0).drift;
  assert.deepEqual(
    keyframes.map((frame) => frame.cx),
    ['100.5px', '120.5px', '120.5px'],
  );
});

test('the receptor band rises from its rest to full at --contact-receptor over --flash-in, and settles over --contact-settle', () => {
  const { keyframes, timing } = band(TOKENS, 0.55);
  assert.deepEqual(keyframes, [
    { strokeOpacity: 0.55, easing: EASE },
    { strokeOpacity: 1, offset: 120 / 1020, easing: EASE },
    { strokeOpacity: 0.55 },
  ]);
  assert.equal(timing.delay, 800);
  assert.equal(timing.duration, 1020);
});

test('the underline rises from the underline color to the text color at --contact-underline, and settles the same way', () => {
  const { keyframes, timing } = underline(TOKENS);
  assert.deepEqual(keyframes, [
    { textDecorationColor: '#67696d', easing: EASE },
    { textDecorationColor: '#dddfe4', offset: 120 / 1020, easing: EASE },
    { textDecorationColor: '#67696d' },
  ]);
  assert.equal(timing.delay, 1000);
  assert.equal(timing.duration, 1020);
});

test('nothing fills, so every part is at its stylesheet’s rest before its animation and after', () => {
  const { drift, fade } = vesicle(TOKENS, 478, 2);
  for (const { timing } of [drift, fade, band(TOKENS, 0.55), underline(TOKENS)]) {
    assert.equal(timing.fill, undefined);
    // Each stretch has its own easing, so the whole runs straight through.
    assert.equal(timing.easing, undefined);
  }
});

// A 375 × 667 phone: the turned figure is 279.5px tall, with the email's
// 44px link box under it.
const figureAt = (top: number): Span => ({ top, bottom: top + 279.5 });
const lineUnder = (figure: Span): Span => ({ top: figure.bottom - 2, bottom: figure.bottom + 42 });

test('the sequence may start when the figure and the email’s line are both fully in view', () => {
  const figure = figureAt(200);
  assert.equal(inView(figure, lineUnder(figure), 667, 1), true);
  // Side by side on a desktop, the line within the figure's height.
  assert.equal(inView({ top: 300, bottom: 500 }, { top: 377, bottom: 423 }, 900, 1), true);
});

test('not while the email’s line is below the screen, though the figure is fully in view', () => {
  const figure = figureAt(380);
  assert.equal(figure.bottom < 667, true);
  assert.equal(inView(figure, lineUnder(figure), 667, 1), false);
  // Nor when the screen's bottom edge cuts the line.
  const cut = figureAt(350);
  assert.equal(inView(cut, lineUnder(cut), 667, 1), false);
});

test('not while the figure is cut, on a screen that could show both', () => {
  // Scrolled past: the screen's top edge cuts the figure, the line is in view.
  const figure = figureAt(-100);
  assert.equal(inView(figure, lineUnder(figure), 667, 1), false);
  // On a desktop, the figure cut at the bottom with the line in view.
  assert.equal(inView({ top: 750, bottom: 950 }, { top: 827, bottom: 873 }, 900, 1), false);
});

test('a box within the slack of the screen’s edge counts as fully in view', () => {
  const figure = figureAt(-0.6);
  assert.equal(inView(figure, lineUnder(figure), 667, 1), true);
  const line = { top: 621.4, bottom: 667.8 };
  assert.equal(inView(figureAt(300), line, 667, 1), true);
  assert.equal(inView(figureAt(300), { top: 623, bottom: 668.5 }, 667, 1), false);
});

test('on a screen too short for both, the email’s line decides, with any of the figure on screen', () => {
  // A phone held sideways, 300px tall: the two together are 321.5px.
  const figure = figureAt(-30);
  const line = lineUnder(figure);
  assert.equal(line.bottom <= 300, true);
  assert.equal(inView(figure, line, 300, 1), true);
  // Not until the line is fully in view.
  const early = figureAt(0);
  assert.equal(inView(early, lineUnder(early), 300, 1), false);
  // And not once the figure has left the screen. With a mouse the line is a
  // plain line of text, 4px under the figure, so it can be in view alone.
  assert.equal(inView(figureAt(-283.5), { top: 0, bottom: 32.2 }, 300, 1), false);
  assert.equal(inView(figureAt(-270), { top: 13.5, bottom: 45.7 }, 300, 1), true);
});
