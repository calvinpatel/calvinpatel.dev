// Tests for the cell index reader. Run from the repo root:
//   node --test tests/cells.test.ts
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { readCellIndex } from '../src/lib/cells.ts';

const CELL = {
  id: 'cell-a',
  file: 'cell-a.json',
  cellType: 'pyramidal',
  credit: 'cell_A (Test archive), via NeuroMorpho.Org, CC BY 4.0',
  url: 'https://neuromorpho.org/neuron_info.jsp?neuron_name=cell_A',
};

// A cells folder holding the given index.json (text, or a value written as
// JSON) and the given cell files. Removed when the test ends.
function folder(t: { after: (fn: () => void) => void }, index?: unknown, files: string[] = []): string {
  const dir = mkdtempSync(join(tmpdir(), 'cells-'));
  t.after(() => rmSync(dir, { recursive: true }));
  if (index !== undefined) {
    writeFileSync(join(dir, 'index.json'), typeof index === 'string' ? index : JSON.stringify(index));
  }
  for (const file of files) writeFileSync(join(dir, file), '{}');
  return dir;
}

test('reads the cells in index order', (t) => {
  const second = { ...CELL, id: 'cell-b', file: 'cell-b.json' };
  const dir = folder(t, { format: 'cell-web-index/1', cells: [second, CELL] }, ['cell-a.json', 'cell-b.json']);
  assert.deepEqual(readCellIndex(dir), [second, CELL]);
});

test("reads the site's own index, and every cell file it lists is there", () => {
  const written = JSON.parse(readFileSync('public/cells/index.json', 'utf8')).cells;
  assert.deepEqual(readCellIndex(), written);
});

test('a missing index stops with a message that names it', (t) => {
  const dir = folder(t);
  assert.throws(() => readCellIndex(dir), /index\.json is missing\. Run the converter/);
});

test('an index that is not JSON stops', (t) => {
  assert.throws(() => readCellIndex(folder(t, '{"cells": [')), /index\.json isn't valid JSON/);
});

test('an empty index stops', (t) => {
  for (const index of [{ format: 'cell-web-index/1', cells: [] }, {}, null, []]) {
    assert.throws(() => readCellIndex(folder(t, index)), /index\.json lists no cells/);
  }
});

test('a cell with no credit or no link stops', (t) => {
  const { credit: _credit, ...uncredited } = CELL;
  assert.throws(() => readCellIndex(folder(t, { cells: [CELL, uncredited] }, ['cell-a.json'])), /cell 2 has no credit/);
  assert.throws(() => readCellIndex(folder(t, { cells: [{ ...CELL, url: ' ' }] }, ['cell-a.json'])), /cell 1 has no url/);
  assert.throws(
    () => readCellIndex(folder(t, { cells: [{ ...CELL, url: 'http://neuromorpho.org/' }] }, ['cell-a.json'])),
    /cell-a's url must start with https:\/\//,
  );
});

test('a listed cell file that does not exist stops with its name', (t) => {
  const dir = folder(t, { cells: [CELL, { ...CELL, id: 'cell-b', file: 'cell-b.json' }] }, ['cell-a.json']);
  assert.throws(() => readCellIndex(dir), /lists cell-b\.json, which isn't in /);
});
