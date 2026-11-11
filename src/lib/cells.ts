// Reads public/cells/index.json, the converter's list of neurons, while the
// site builds. The Credits page prints one credit line per cell from it
// (CLAUDE.md rule 13), so a missing or broken index stops the build with a
// message that says what is wrong.
//
// No Astro imports, so Node can run tests/cells.test.ts against it directly.
// Build time only: it reads the disk.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** One neuron in index.json (docs/cell-web-v1.md, The index file). */
export interface CellEntry {
  id: string;
  file: string;
  cellType: string;
  credit: string;
  url: string;
}

const FIELDS = ['id', 'file', 'cellType', 'credit', 'url'] as const;
const CONVERT = 'Run the converter (CLAUDE.md, Commands) to write it again.';

/**
 * Every cell in the index, in index order. `dir` is the folder that holds
 * index.json and the cell files, from the repo root.
 */
export function readCellIndex(dir = 'public/cells'): CellEntry[] {
  const path = join(dir, 'index.json');
  if (!existsSync(path)) throw new Error(`${path} is missing. ${CONVERT}`);

  let index: { cells?: unknown } | null;
  try {
    index = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`${path} isn't valid JSON: ${(error as Error).message}`);
  }

  const cells = index?.cells;
  if (!Array.isArray(cells) || cells.length === 0) throw new Error(`${path} lists no cells. ${CONVERT}`);

  cells.forEach((cell, i) => {
    for (const field of FIELDS) {
      if (typeof cell?.[field] !== 'string' || !cell[field].trim()) {
        throw new Error(`${path}: cell ${i + 1} has no ${field}. ${CONVERT}`);
      }
    }
    if (!cell.url.startsWith('https://')) {
      throw new Error(`${path}: ${cell.id}'s url must start with https://. Fix its row in data/swc/sources.csv.`);
    }
    if (!existsSync(join(dir, cell.file))) {
      throw new Error(`${path} lists ${cell.file}, which isn't in ${dir}. ${CONVERT}`);
    }
  });
  return cells;
}
