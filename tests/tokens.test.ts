// Tests for reading a token's number. Run from the repo root:
//   node --test tests/tokens.test.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { tokenNumber } from '../src/lib/tokens.ts';

const TOKENS = new URL('../src/styles/tokens.css', import.meta.url);

/** Every custom property in a stylesheet, by name, comments left out. */
function tokensOf(css: string): Map<string, string> {
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return new Map([...rules.matchAll(/(--[\w-]+)\s*:\s*([^;}]+)/g)].map((match) => [match[1], match[2].trim()]));
}

/**
 * tokens.css as the built site serves it: minified by Vite, which Astro
 * builds with, with the one setting Astro gives it for CSS (`cssMinify: true`
 * in astro/dist/core/build/vite-build-config.js). Vite picks the minifier,
 * so this follows it if a later version picks another.
 */
async function minified(): Promise<string> {
  const { build } = await import('vite');
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    root: fileURLToPath(new URL('..', import.meta.url)),
    build: { write: false, cssMinify: true, rolldownOptions: { input: fileURLToPath(TOKENS) } },
  });
  const files = [result].flat().flatMap((built) => ('output' in built ? built.output : []));
  const sheet = files.find((file) => file.type === 'asset' && file.fileName.endsWith('.css'));
  assert.ok(sheet && sheet.type === 'asset', 'the build gave no stylesheet');
  return sheet.source.toString();
}

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
  const css = readFileSync(TOKENS, 'utf8');
  const times = [...css.matchAll(/^\s*--[\w-]+:\s*(\d+)ms;/gm)].map((match) => Number(match[1]));
  assert.ok(times.length > 30);
  for (const ms of times) {
    assert.equal(tokenNumber(`${ms}ms`), ms);
    assert.equal(tokenNumber(`${ms / 1000}s`), ms);
    assert.equal(tokenNumber(`${ms / 1000}s`.replace(/^0\./, '.')), ms);
  }
});

// The guard for what 7b14cce fixed: the build rewrote every time token, and
// the scripts read them a thousand times too short. Whatever the minifier
// does to a token, a script must read the number tokens.css gives it.
test("every token reads the same number before and after the build's minifier", async () => {
  const written = tokensOf(readFileSync(TOKENS, 'utf8'));
  const built = tokensOf(await minified());
  assert.ok(written.size > 150);
  // The check means nothing unless the minifier still changes what is written.
  const rewritten = [...written].filter(([name, value]) => built.get(name) !== value);
  assert.ok(rewritten.length > 0, 'the minifier changed no token');
  for (const [name, value] of written) {
    const after = built.get(name);
    assert.ok(after !== undefined, `${name} is missing from the minified stylesheet`);
    assert.equal(tokenNumber(after), tokenNumber(value), `${name}: ${value} is ${after} once minified`);
  }
});
