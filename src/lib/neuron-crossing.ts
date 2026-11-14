// When a pointer over the hero's neuron layer sends input (DESIGN.md, Motion:
// Hero neuron layer, Input): a crossing sends one pulse.
//
//   - A branch is a stretch of dendrite between branch points. A pointer
//     sends one input when it comes within reach of a branch. Staying on it,
//     moving along it, and leaving it send nothing more.
//   - A branch counts as left only once the pointer is clearly away, further
//     than it had to come to touch it (POINTER.leave), so a pointer resting
//     at the edge of the reach can't flicker inputs. Coming back after that
//     is a new crossing.
//   - Where branches meet, at a branch point or at the soma, they are one
//     crossing. Coming within reach of several together sends one input,
//     from the nearest. A branch that meets one the pointer is still on
//     isn't a new crossing until the pointer has left that one: so a pointer
//     that follows a dendrite past a fork sends one input a little way along
//     the new branch, not one for each branch of the fork.
//   - A branch that doesn't meet any the pointer is on is a new crossing as
//     soon as the pointer comes within reach of it.
//   - The soma follows the same rule: touching it fires the cell once, and
//     again only after the pointer has left and come back. Close in, where a
//     dendrite's nearest spot is inside the soma's own reach, the touch is
//     the soma's and not the dendrite's. Its dendrites count as touched while
//     the pointer is on it, so leaving along one sends nothing.
//
// One Crossing holds what one pointer is on in one cell. NeuronLayer.astro's
// script keeps one per cell and starts them afresh with each new touch of a
// finger. It also keeps the pointer's touches in a queue until a frame works
// them out; working them out, and forgetting what the pointer is on, are
// here too (workOut, forget). No DOM and no Astro imports, so Node can run
// tests/neuron-crossing.test.ts against it directly.

import { POINTER, SHAPE, branchesMeet, nearBranches, somaGap } from './neuron-cell.ts';
import type { DrawnCell } from './neuron-cell.ts';

/** What one pointer is on, in one cell. */
export interface Crossing {
  soma: boolean;
  branches: Set<number>;
}

/** A pointer that is on nothing. */
export function noCrossing(): Crossing {
  return { soma: false, branches: new Set() };
}

/**
 * What a pointer newly touches as it moves to (x, y), in px from the cell's
 * soma: 0 for the soma, the end point of a dendrite's stretch for a branch
 * it has just crossed, or -1 for nothing new. `reach` is how near the pointer
 * has to come to touch a dendrite. Updates `crossing`.
 */
export function cross(crossing: Crossing, cell: DrawnCell, x: number, y: number, reach: number): number {
  const margin = reach * (POINTER.leave - 1);
  const near = nearBranches(cell, x, y, reach + margin);
  const on = crossing.branches;

  // Leave what the pointer is now clearly away from.
  const stillNear = new Set(near.map((one) => one.branch));
  for (const branch of on) if (!stillNear.has(branch)) on.delete(branch);
  const gap = somaGap(cell, x, y);
  if (crossing.soma && gap > margin) crossing.soma = false;

  const within = near.filter((one) => one.distance <= reach);

  if (gap <= 0) {
    for (const one of within) on.add(one.branch);
    if (crossing.soma) return -1;
    crossing.soma = true;
    return 0;
  }

  // The branches newly within reach that are a crossing of their own: not
  // the soma's touch, and not meeting a branch the pointer is still on.
  const somaTouch = cell.somaRadius + SHAPE.soma.reach;
  const held = [...on];
  const fresh = within.filter(
    (one) =>
      !on.has(one.branch) &&
      Math.hypot(one.x, one.y) > somaTouch &&
      !held.some((branch) => branchesMeet(cell, branch, one.branch)),
  );
  if (fresh.length === 0) return -1;
  for (const one of fresh) on.add(one.branch);
  return fresh.reduce((best, one) => (one.distance < best.distance ? one : best)).point;
}

/**
 * A touch of the layer that no frame has worked out yet: where the pointer
 * was, in px from the canvas's corner, and how near it has to come to a
 * dendrite. The layer keeps them in a queue, oldest first, and each frame
 * works them out. (Not the browser's Touch, which is one finger on a screen.)
 */
export interface Pending {
  x: number;
  y: number;
  reach: number;
}

/**
 * One frame's share of the waiting touches, oldest first: `touch` works each
 * one out against what the pointer is on. At most `most` in one frame
 * (POINTER.perFrame); any beyond that are dropped, not kept for the next.
 */
export function workOut(waiting: Pending[], most: number, touch: (one: Pending) => void): void {
  for (const one of waiting.splice(0, most)) touch(one);
  waiting.length = 0;
}

/**
 * The pointer is gone, or the page has moved under it: it is on nothing in
 * any of `cells`, so whatever it touches next is a new crossing. What it
 * touched on its way here is worked out first, by what it was on then. Left
 * for the next frame, a finger's last move before its swipe became a scroll
 * counted against nothing, and sent the dendrite it started on a second input.
 */
export function forget(waiting: Pending[], cells: { crossing: Crossing }[], touch: (one: Pending) => void): void {
  for (const one of waiting.splice(0)) touch(one);
  for (const cell of cells) cell.crossing = noCrossing();
}
