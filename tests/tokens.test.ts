// Tests for reading a token's number. Run from the repo root:
//   node --test tests/tokens.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { tokenNumber } from '../src/lib/tokens.ts';

test('a plain number and a px length read as written', () => {
  assert.equal(tokenNumber('0.45'), 0.45);
  assert.equal(tokenNumber(' .45'), 0.45);
  assert.equal(tokenNumber('4px'), 4);
  assert.equal(tokenNumber('1.2px'), 1.2);
  assert.equal(tokenNumber('0.32'), 0.32);
});

test('a time reads in ms, as tokens.css writes it', () => {
  assert.equal(tokenNumber('130ms'), 130);
  assert.equal(tokenNumber(' 5000ms'), 5000);
});

test("a time reads in ms after the build's minifier has rewritten it in seconds", () => {
  assert.equal(tokenNumber('.13s'), 130);
  assert.equal(tokenNumber('.12s'), 120);
  assert.equal(tokenNumber('.4s'), 400);
  assert.equal(tokenNumber('5s'), 5000);
  assert.equal(tokenNumber('2.7s'), 2700);
  assert.equal(tokenNumber('.024s'), 24);
});

test('every time in tokens.css reads the same in either unit', () => {
  const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
  const times = [...css.matchAll(/^\s*--[\w-]+:\s*(\d+)ms;/gm)].map((match) => Number(match[1]));
  assert.ok(times.length > 30);
  for (const ms of times) {
    assert.equal(tokenNumber(`${ms}ms`), ms);
    assert.equal(tokenNumber(`${ms / 1000}s`), ms);
    assert.equal(tokenNumber(`${ms / 1000}s`.replace(/^0\./, '.')), ms);
  }
});
