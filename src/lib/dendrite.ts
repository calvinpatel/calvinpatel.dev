// How the About dendrite grows (DESIGN.md, Motion: About dendrite). It grows
// one turning point at a time, from the soma down:
//
//   - A turning point's stretch of trunk grows over --grow. Its branch draws
//     over --draw, starting --grow-stagger after the stretch. Its dots appear
//     over --fade: the soma as the stretch starts, a bouton or the cone's
//     tips as the branch finishes.
//   - The turning point below may start 2 × --grow-stagger into this one's
//     own play time.
//   - A turning point grows when its box is fully in view. Those above it
//     that haven't finished come first: at once if they are fully off screen,
//     where no one can see them, and otherwise in order.
//
// Dendrite.astro's script measures the page and runs the animations these
// describe. No DOM and no Astro imports, so Node can run
// tests/dendrite.test.ts against it directly.

/** The growth's times from tokens.css, in ms. */
export interface GrowthTokens {
  grow: number; // --grow
  draw: number; // --draw
  stagger: number; // --grow-stagger
  fade: number; // --fade
}

/** When a part starts, counted from its turning point's start, and how long it takes. */
export interface Span {
  delay: number;
  duration: number;
}

export interface Growth {
  stretch: Span; // the trunk, down to the next turning point
  soma: Span;
  branch: Span;
  dots: Span; // the pruned branch's bouton and the cone's tips
  /** The turning point below starts this far into this one's play time, at the earliest. */
  gate: number;
}

/** One turning point's timeline. Every turning point has the same one. */
export function growth({ grow, draw, stagger, fade }: GrowthTokens): Growth {
  return {
    stretch: { delay: 0, duration: grow },
    soma: { delay: 0, duration: fade },
    branch: { delay: stagger, duration: draw },
    dots: { delay: stagger + draw, duration: fade },
    gate: 2 * stagger,
  };
}

/**
 * Where each turning point's stretch of trunk ends, in px from the trunk's
 * top: at the top of the next paragraph, and the last at the trunk's own end,
 * the cone's tip. `paragraphTops` are the story's paragraphs, in order, on the
 * same axis as `trunk.top`.
 */
export function stageEnds(trunk: { top: number; height: number }, paragraphTops: number[]): number[] {
  return [...paragraphTops.slice(1).map((top) => top - trunk.top), trunk.height];
}

type Point = [number, number];

// Chords along a curve. A branch's curve is about 20px long and gentle, so
// this many put its length within a thousandth of a px.
const CHORDS = 64;

/**
 * The length of the longest stroke in a branch's path data: the dash that
 * draws it. A dash pattern starts over on each stroke, so one dash this long,
 * slid along the path, draws every stroke from its own start at one speed and
 * finishes with the longest. Reads the three commands the dendrite uses (M, Q,
 * and L, absolute); any other is an error, not a wrong length.
 */
export function longestStroke(d: string): number {
  const words = d.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)/g) ?? [];
  let at = 0;
  const point = (): Point => {
    const pair: Point = [Number(words[at]), Number(words[at + 1])];
    if (Number.isNaN(pair[0]) || Number.isNaN(pair[1])) throw new Error(`Can't read the path "${d}".`);
    at += 2;
    return pair;
  };
  const between = (a: Point, b: Point) => Math.hypot(b[0] - a[0], b[1] - a[1]);

  let longest = 0;
  let length = 0;
  let from: Point | undefined;
  while (at < words.length) {
    const command = words[at++];
    if (command === 'M') {
      from = point();
      length = 0;
      continue;
    }
    if (from === undefined) throw new Error(`The path "${d}" doesn't start with M.`);
    if (command === 'L') {
      const to = point();
      length += between(from, to);
      from = to;
    } else if (command === 'Q') {
      const [start, control, to] = [from, point(), point()];
      for (let i = 1; i <= CHORDS; i++) {
        const t = i / CHORDS;
        const next: Point = [0, 1].map(
          (axis) => (1 - t) ** 2 * start[axis] + 2 * (1 - t) * t * control[axis] + t ** 2 * to[axis],
        ) as Point;
        length += between(from, next);
        from = next;
      }
    } else {
      throw new Error(`Can't read "${command}" in the path "${d}": only M, Q, and L.`);
    }
    longest = Math.max(longest, length);
  }
  return longest;
}

/** One turning point, as the page has it now. */
export interface Turn {
  /** Its box, at the top of its paragraph, is fully in view. */
  inView: boolean;
  /** Any part of its stretch, its paragraph and the gap below, is on screen. */
  onScreen: boolean;
  started: boolean;
  /** Fully grown: it played to the end, or was sent there. */
  finished: boolean;
}

/** What the turning points above one in view must do first, by their place in the story. */
export interface Call {
  /** Fully off screen: these finish at once, with no motion. */
  finish: number[];
  /** Partly on screen: these grow, in order, though their own boxes aren't in view. */
  grow: number[];
}

/**
 * The turning points to bring up to date so the lowest one in view can grow.
 * Each unfinished one above it finishes at once if no part of its stretch is
 * on screen, even one held mid-growth, and is called on to grow otherwise.
 * With none in view and waiting, or nothing unfinished above, there is
 * nothing to do. A call lasts only while the box that made it is in view: one
 * held off screen with no box in view stays held.
 */
export function callAbove(turns: Turn[]): Call {
  const call: Call = { finish: [], grow: [] };
  const lowest = turns.findLastIndex((turn) => turn.inView && !turn.started && !turn.finished);
  turns.slice(0, Math.max(lowest, 0)).forEach((turn, i) => {
    if (turn.finished) return;
    if (!turn.onScreen) call.finish.push(i);
    else if (!turn.started) call.grow.push(i);
  });
  return call;
}
