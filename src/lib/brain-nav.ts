// The brain navigation's rules that need no page to work out (DESIGN.md,
// Components: Brain label; Motion: Brain callouts and labels): where a label
// sits, how long a callout's pulse runs, which cell the cursor is nearest,
// and whether a tap previews a lobe or goes to its section. Brain.astro's
// script measures the page and applies what these return.
//
// No DOM and no Astro imports, so Node can run tests/brain-nav.test.ts against
// it directly.

/** A box on the page, in px. */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface LabelFit {
  box: Box; // the label where its callout puts it: its shelf starting at the callout's tip
  side: 'left' | 'right'; // which way the label runs from the tip
  viewportRight: number; // the viewport's right edge
  inset: number; // the room a label keeps from that edge
  text: readonly Box[]; // the hero text's ink, line by line
  clearance: number; // the room a label keeps from that text
}

/**
 * How far a label slides along its shelf, in px, to stay inside the viewport
 * and clear of the hero text. Positive is rightward.
 *
 *   - A label running right slides left until it is `inset` inside the
 *     viewport's right edge.
 *   - A label running left slides right until it is `clearance` from every
 *     line of hero text it would otherwise come nearer to.
 *   - The callout's tip stays on the shelf, so a label never slides further
 *     than its own width. Where both limits can't be met, the viewport wins.
 */
export function slideLabel({ box, side, viewportRight, inset, text, clearance }: LabelFit): number {
  const width = box.right - box.left;
  const limit = viewportRight - inset;
  let slide = 0;
  if (side === 'left') {
    // Each line it would crowd pushes it right, past that line's end.
    for (const line of text) {
      const beside = box.top < line.bottom + clearance && box.bottom > line.top - clearance;
      const crowds = box.left + slide < line.right + clearance && box.right + slide > line.left - clearance;
      if (beside && crowds) slide = Math.max(slide, line.right + clearance - box.left);
    }
    slide = Math.min(slide, width);
  }
  if (box.right + slide > limit) slide = limit - box.right;
  return side === 'left' ? Math.max(slide, 0) : Math.max(slide, -width);
}

/**
 * How long the pulse takes to run a callout, in ms: its length on screen at
 * the signal's speed, kept between `min` and `max` so a short callout still
 * reads as travel and a long one doesn't hold its label back.
 */
export function pulseMs(length: number, scale: number, speed: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, (length * scale) / speed)));
}

/** How near the cursor has to come to a cell's soma to fire it, in viewBox units. */
export const REACH = 30;

/** The index of the cell nearest a point, or -1 when none is within `reach`. */
export function nearestCell(cells: readonly { x: number; y: number }[], x: number, y: number, reach = REACH): number {
  let best = -1;
  let bestDistance = reach;
  cells.forEach((cell, i) => {
    const d = Math.hypot(cell.x - x, cell.y - y);
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  });
  return best;
}

/** The press that came just before a click, as its pointerdown event described it. */
export interface Press {
  pointerType: string;
  width: number;
  height: number;
}

/**
 * What a click on a lobe does. Going to the section is the rule. A click
 * previews the lobe instead only when all of this holds:
 *
 *   - it follows a press on that lobe by a finger or a pen;
 *   - the press had a size, because a screen reader's activation arrives as a
 *     press with none (VoiceOver's double-tap, for one);
 *   - the click counts at least one press (`detail`), which a keyboard's or an
 *     assistive tool's click does not;
 *   - the lobe isn't already showing its preview.
 *
 * There is no certain way to tell a screen reader's activation from a tap, so
 * anything short of a plainly real touch goes straight to the section.
 */
export function tapAction(press: Press | null, detail: number, active: boolean): 'preview' | 'go' {
  if (active || press === null || detail === 0) return 'go';
  if (press.pointerType !== 'touch' && press.pointerType !== 'pen') return 'go';
  if (press.width === 0 && press.height === 0) return 'go';
  return 'preview';
}
