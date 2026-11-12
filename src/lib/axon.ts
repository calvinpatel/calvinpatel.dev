// The order an axon divider's parts flash in (DESIGN.md, Motion: Axon
// dividers). The signal hops left to right, one --hop per node:
//
//   - On the first divider the soma flashes first, and the first node one hop
//     later. On the others the first node flashes as the divider starts.
//   - Only nodes that show count, so the signal never pauses on a node nobody
//     can see and the gaps stay one hop at every width.
//   - On the last divider the three boutons flash together, one hop after the
//     last node.
//
// Axon.astro's script measures the divider and starts the flashes these
// return. No DOM and no Astro imports, so Node can run tests/axon.test.ts
// against it directly.

/** Which divider this is: the first in its section, the last, or one between. */
export type Part = 'soma' | 'terminal' | undefined;

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Whether a node can be seen. `row` is the sheath row's box, which clips its
 * nodes: one past the right end, or wrapped under the band before a terminal,
 * is outside it. A node the right end cuts through counts while its center
 * shows. `hidden` is the first divider's leading node, which CSS hides.
 */
export function nodeShows(node: Box, row: Box, hidden: boolean): boolean {
  if (hidden) return false;
  const x = (node.left + node.right) / 2;
  const y = (node.top + node.bottom) / 2;
  return x >= row.left && x <= row.right && y >= row.top && y <= row.bottom;
}

/** When each part starts, in hops from the divider's start. `null` never flashes. */
export interface Schedule {
  soma: number | null;
  nodes: (number | null)[]; // one per node, left to right
  boutons: number | null; // all three together
}

/** The schedule for one divider, given which of its nodes show, left to right. */
export function flashSchedule(part: Part, shows: boolean[]): Schedule {
  let hop = 0;
  const soma = part === 'soma' ? hop++ : null;
  const nodes = shows.map((show) => (show ? hop++ : null));
  return { soma, nodes, boutons: part === 'terminal' ? hop : null };
}
