// How a cell of the hero's neuron layer takes input and fires (DESIGN.md,
// Motion: Hero neuron layer). Ported from the hero layer of the approved
// spike, docs/spikes/brain-navigation.html. NeuronLayer.astro's script keeps
// the cells and the clock, and draws the brightness these return.
//
//   - Input on a dendrite travels to the soma as a short burst. Less of it
//     arrives from further out.
//   - The soma sums what arrives, which leaks away, and fires at a threshold.
//     Touching the soma itself fires it at once.
//   - A spike spreads back out through the dendrites and fades outward from
//     the soma, whose glow ripples outward as it fades. None of the ten
//     cells has a traced axon, so nothing runs down one.
//   - With reduced motion (`still`), nothing travels: a signal's whole path
//     lights at once and fades in place, and the glow doesn't spread.
//
// Times are ms and speeds px per ms, from the tokens. No DOM and no Astro
// imports, so Node can run tests/neuron-signal.test.ts against it directly.

/** The signals' fixed values. */
export const SIGNAL = {
  // A wave's brightness at a point: strength × the larger of `floor` and how
  // far it has decayed over `length` (a share of the cell's longest path).
  input: { strength: 0.95, floor: 0.35, length: 0.55 },
  // The floor keeps the tips bright enough that each point fades a set time
  // after the spike reaches it, so the fade sweeps outward too.
  spike: { strength: 0.55, floor: 0.45, length: 1.1 },
  touch: 1.2, // what touching the soma delivers: over the threshold
  own: 0.5, // how strong a spike is when a cell fires on its own
  span: 5, // a fade is over after this many of its time constants
  faint: 0.015, // a point dimmer than this isn't drawn
  steps: 10, // brightness is drawn in this many steps
  halo: { width: 5, widen: 5, alpha: 0.2 }, // the soft line under a signal: px, and px more at full brightness
  core: { widen: 1.3, alpha: 1.1 }, // the signal itself: the cell's mean line width, and px more at full brightness
  glow: {
    charge: 0.5, // how much of the soma's charge shows as glow
    peak: 0.9, // the glow's opacity at its center when a spike starts
    near: 3, // its radius in soma radii as it starts,
    spread: 7, // and how many more it has spread by the time it has faded
    faint: 0.02, // a glow dimmer than this isn't drawn
  },
} as const;

/** The tokens the signals need, as numbers. */
export interface Timing {
  dendrite: number; // --signal-dendrite
  backprop: number; // --signal-backprop
  tau: number; // --membrane-tau
  threshold: number; // --fire-threshold
  refractory: number; // --refractory
  rise: number; // --signal-rise
  inputFade: number; // --signal-input-fade
  inputGap: number; // --signal-input-gap
  backpropFade: number; // --signal-backprop-fade
  flash: number; // --soma-flash
}

/** What a wave needs of a cell (neuron-cell.ts's DrawnCell has it). */
export interface Arbor {
  count: number;
  dist: Float32Array; // from the soma along the branches, px
  farthest: number;
}

/** A soma's state. */
export interface Membrane {
  charge: number; // as of `at`
  at: number;
  lastSpike: number;
  gain: number; // the last spike's strength
  lastInput: number;
}

export function restingMembrane(): Membrane {
  return { charge: 0, at: 0, lastSpike: -Infinity, gain: 1, lastInput: -Infinity };
}

/** One signal crossing a cell. */
export interface Wave {
  cell: number; // which placed cell
  points: Int32Array | null; // the points it crosses; null is every dendrite point
  start: number;
  speed: number;
  from: number; // where it starts, as a distance from the soma
  strength: number;
  floor: number;
  length: number; // px over which it decays
  fade: number;
  end: number; // when the last of it has faded
  arrives: number; // when an input reaches the soma; NaN for a spike
  charge: number; // what an input delivers there
  delivered: boolean;
}

/** Whether a cell takes an input now: at most one every --signal-input-gap. Takes it if so. */
export function takeInput(membrane: Membrane, now: number, timing: Timing): boolean {
  if (now - membrane.lastInput < timing.inputGap) return false;
  membrane.lastInput = now;
  return true;
}

/**
 * The burst an input at a dendrite point sends to the soma. `path` is the
 * points from there to the soma (pathToSoma).
 */
export function inputWave(
  cell: number,
  arbor: Arbor,
  path: Int32Array,
  now: number,
  timing: Timing,
  still: boolean,
): Wave {
  const from = arbor.dist[path[0]];
  const length = arbor.farthest * SIGNAL.input.length;
  const arrives = now + (still ? 0 : from / timing.dendrite);
  return {
    cell,
    points: path,
    start: now,
    speed: still ? Infinity : timing.dendrite,
    from,
    strength: SIGNAL.input.strength,
    floor: SIGNAL.input.floor,
    length,
    fade: timing.inputFade,
    end: arrives + timing.rise + SIGNAL.span * timing.inputFade,
    arrives,
    charge: Math.exp(-from / length),
    delivered: false,
  };
}

/** The soma's charge at `now`: what has arrived, less what has leaked away. */
export function chargeAt(membrane: Membrane, now: number, timing: Timing): number {
  return membrane.charge * Math.exp(-Math.max(0, now - membrane.at) / timing.tau);
}

/** Records a spike at time `at`. */
export function spike(membrane: Membrane, at: number, gain: number): void {
  membrane.lastSpike = at;
  membrane.gain = gain;
  membrane.charge = 0;
  membrane.at = at;
}

/** Adds `amount` to the soma's charge at time `at`. Returns whether the cell fires. */
export function deliver(membrane: Membrane, amount: number, at: number, timing: Timing): boolean {
  membrane.charge = chargeAt(membrane, at, timing) + amount;
  membrane.at = at;
  if (membrane.charge < timing.threshold || at - membrane.lastSpike <= timing.refractory) return false;
  spike(membrane, at, 1);
  return true;
}

/** The spike spreading back out through every dendrite. */
export function spikeWave(cell: number, arbor: Arbor, at: number, gain: number, timing: Timing, still: boolean): Wave {
  return {
    cell,
    points: null,
    start: at,
    speed: still ? Infinity : timing.backprop,
    from: 0,
    strength: SIGNAL.spike.strength * gain,
    floor: SIGNAL.spike.floor,
    length: arbor.farthest * SIGNAL.spike.length,
    fade: timing.backpropFade,
    end: at + firingLength(arbor, timing, still),
    arrives: NaN,
    charge: 0,
    delivered: true,
  };
}

/** How long one firing takes to cross a cell and fade, in ms. */
export function firingLength(arbor: Arbor, timing: Timing, still = false): number {
  const travel = still ? 0 : arbor.farthest / timing.backprop;
  return travel + timing.rise + SIGNAL.span * timing.backpropFade;
}

/**
 * Raises `bright` (one value per point, 0 to 1) to the wave's brightness at
 * `now`, wherever the wave is the brighter. A point rises over --signal-rise
 * as the wave arrives, then fades.
 */
export function brighten(wave: Wave, arbor: Arbor, now: number, timing: Timing, bright: Float32Array): void {
  const count = wave.points ? wave.points.length : arbor.count - 1;
  for (let k = 0; k < count; k++) {
    const i = wave.points ? wave.points[k] : k + 1;
    const away = Math.abs(wave.from - arbor.dist[i]);
    const most = wave.strength * Math.max(wave.floor, Math.exp(-away / wave.length));
    if (most < SIGNAL.faint) continue;
    const since = now - (wave.start + away / wave.speed);
    if (since < 0 || since > timing.rise + wave.fade * SIGNAL.span) continue;
    const shape = since < timing.rise ? since / timing.rise : Math.exp(-(since - timing.rise) / wave.fade);
    const value = Math.min(1, most * shape);
    if (value > bright[i]) bright[i] = value;
  }
}

/** How much of the last spike's flash is left, 0 to its gain. */
export function flashAt(membrane: Membrane, now: number, timing: Timing): number {
  return now < membrane.lastSpike ? 0 : Math.exp(-(now - membrane.lastSpike) / timing.flash) * membrane.gain;
}

/**
 * The soma's glow at `now`: its opacity at the center, and its radius in soma
 * radii. Charge short of the threshold glows faintly; a spike's flash glows
 * fully and ripples outward as it fades. Null when there is nothing to draw.
 */
export function somaGlow(
  membrane: Membrane,
  now: number,
  timing: Timing,
  still: boolean,
): { alpha: number; radius: number } | null {
  const { glow } = SIGNAL;
  const flash = flashAt(membrane, now, timing);
  const strength = Math.min(1, chargeAt(membrane, now, timing) * glow.charge + flash);
  if (strength <= glow.faint) return null;
  const spread = still || flash <= glow.faint ? 0 : 1 - flash;
  return { alpha: strength * glow.peak, radius: glow.near + glow.spread * spread };
}

/** Whether a cell has waited long enough since its last spike to fire on its own. */
export function isQuiet(membrane: Membrane, now: number, quiet: number): boolean {
  return now - membrane.lastSpike > quiet;
}
