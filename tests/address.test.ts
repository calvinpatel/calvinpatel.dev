// Tests for the page address helper. Run from the repo root:
//   node --test tests/address.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { pagePath, pageUrl } from '../src/lib/address.ts';

const SITE = 'https://calvinpatel.dev';

test('the paths Astro reports while it builds become the served addresses', () => {
  assert.equal(pagePath('/index.html'), '/');
  assert.equal(pagePath('/credits.html'), '/credits');
  assert.equal(pagePath('/projects/notepilot.html'), '/projects/notepilot');
  assert.equal(pagePath('/404.html'), '/404');
});

test('a folder form loses its slash, as Cloudflare redirects it', () => {
  assert.equal(pagePath('/credits/'), '/credits');
  assert.equal(pagePath('/projects/notepilot/'), '/projects/notepilot');
  assert.equal(pagePath('/credits/index.html'), '/credits');
});

test('a served address is left as it is', () => {
  assert.equal(pagePath('/'), '/');
  assert.equal(pagePath('/credits'), '/credits');
  assert.equal(pagePath('/projects/notepilot'), '/projects/notepilot');
});

test('only a page file loses its ending', () => {
  assert.equal(pagePath('/sitemap.xml'), '/sitemap.xml');
  assert.equal(pagePath('/projects/index.html'), '/projects');
  assert.equal(pagePath('/html'), '/html');
});

test('a full address is on the site, with no trailing slash but the home page', () => {
  assert.equal(pageUrl('/index.html', SITE), 'https://calvinpatel.dev/');
  assert.equal(pageUrl('/credits.html', SITE), 'https://calvinpatel.dev/credits');
  assert.equal(pageUrl('/projects/notepilot', new URL(SITE)), 'https://calvinpatel.dev/projects/notepilot');
});

test('a full address needs the site', () => {
  assert.throws(() => pageUrl('/credits', undefined), /sets no `site`/);
});
