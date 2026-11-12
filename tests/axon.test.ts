// Tests for the order an axon divider's parts flash in. Run from the repo root:
//   node --test tests/axon.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { flashSchedule, nodeShows } from '../src/lib/axon.ts';
import type { Box } from '../src/lib/axon.ts';

// A divider's markup always holds 16 nodes: the leading one, then one after
// each of 15 sheaths.
const NODES = 16;
const showing = (from: number, to: number) => Array.from({ length: NODES }, (_, i) => i >= from && i < to);

test('the soma divider: the soma first, then each showing node one hop apart', () => {
  // The leading node is hidden, and the right end cuts the last one off.
  const { soma, nodes, boutons } = flashSchedule('soma', showing(1, 15));
  assert.equal(soma, 0);
  assert.equal(nodes[0], null);
  assert.deepEqual(nodes.slice(1, 15), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  assert.equal(nodes[15], null);
  assert.equal(boutons, null);
});

test('a divider between projects: the first node flashes as the divider starts', () => {
  const { soma, nodes, boutons } = flashSchedule(undefined, showing(0, 15));
  assert.equal(soma, null);
  assert.deepEqual(nodes.slice(0, 15), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  assert.equal(nodes[15], null);
  assert.equal(boutons, null);
});

test('the terminal: the boutons flash together, one hop after the last showing node', () => {
  // Two units wrapped away before the split, and one never fit.
  const { soma, nodes, boutons } = flashSchedule('terminal', showing(0, 13));
  assert.equal(soma, null);
  assert.deepEqual(nodes.slice(0, 13), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.deepEqual(nodes.slice(13), [null, null, null]);
  assert.equal(boutons, 13);
});

test('a narrow divider: only the nodes that show are counted, so the gaps stay one hop', () => {
  // A phone's terminal: four nodes, then the boutons.
  assert.deepEqual(flashSchedule('terminal', showing(0, 4)), {
    soma: null,
    nodes: [0, 1, 2, 3, ...Array(12).fill(null)],
    boutons: 4,
  });
  // A phone's soma divider: the soma, then three nodes.
  assert.deepEqual(flashSchedule('soma', showing(1, 4)).nodes.slice(0, 5), [null, 1, 2, 3, null]);
});

test('a hidden node between two that show is skipped without a pause', () => {
  const shows = [true, false, true, true];
  assert.deepEqual(flashSchedule(undefined, shows).nodes, [0, null, 1, 2]);
});

test('with no node showing, the boutons flash as the divider starts', () => {
  assert.equal(flashSchedule('terminal', showing(0, 0)).boutons, 0);
  assert.deepEqual(flashSchedule(undefined, showing(0, 0)), { soma: null, nodes: Array(NODES).fill(null), boutons: null });
});

// A 300px sheath row, its band 28px tall, and a node 3.6px across at x.
const ROW: Box = { left: 20, top: 100, right: 320, bottom: 128 };
const node = (x: number, y = 114): Box => ({ left: x - 1.8, top: y - 1.8, right: x + 1.8, bottom: y + 1.8 });

test('a node inside the row shows', () => {
  assert.equal(nodeShows(node(24), ROW, false), true);
  assert.equal(nodeShows(node(180), ROW, false), true);
});

test('a node past the right end does not show', () => {
  assert.equal(nodeShows(node(336), ROW, false), false);
});

test('a node the right end cuts through shows while its center does', () => {
  assert.equal(nodeShows(node(319.5), ROW, false), true);
  assert.equal(nodeShows(node(320.5), ROW, false), false);
});

test('a node wrapped under the band before a terminal does not show', () => {
  assert.equal(nodeShows(node(96, 142), ROW, false), false);
});

test("the soma divider's hidden leading node does not show", () => {
  assert.equal(nodeShows(node(24), ROW, true), false);
});
