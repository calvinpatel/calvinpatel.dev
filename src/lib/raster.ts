// The Experience raster's pattern (DESIGN.md, Drawings: Spike raster): where
// one row's year marks, spikes, and marker sit, in px from the row's left end.
// Raster.astro's script draws what rasterRow returns.
//
//   - Every row shares one time axis, from January 1 of the earliest start
//     year to "now", the build date. Dates are UTC.
//   - A role's spikes come in bursts, placed left to right from a generator
//     seeded by the role's own dates and schedule, so the pattern is the same
//     on every load and every build.
//   - Spacing is in px, so a narrower row holds fewer spikes, not tighter ones.
//   - Each role's start and the marker move by up to half a pixel so that
//     every spike and the marker are centered on a pixel. A spike is a little
//     over 1px wide, so it then sits mostly in one pixel column on a 1x
//     screen, and every row looks equally sharp.
//
// No DOM and no Astro imports, so Node can run tests/raster.test.ts against it
// directly. Every size comes in through `pattern`, which the script fills from
// the --raster-* tokens.

import { toPixelCenter } from './pixels.ts';

export type Schedule = 'full-time' | 'part-time';

/** One entry's raster fields, as written in src/content/experience.md. */
export interface Role {
  start: string; // YYYY-MM
  end: string; // YYYY-MM, or 'present'
  schedule: Schedule;
}

/** The time axis every row shares. */
export interface Axis {
  startYear: number; // the axis starts on January 1 of this year
  now: string; // the build date, YYYY-MM-DD
}

/** The --raster-* tokens the pattern needs, as numbers. */
export interface Pattern {
  pitch: number; // spike to spike inside a burst
  burst: Record<Schedule, [min: number, max: number]>; // spikes per burst
  gap: Record<Schedule, [min: number, max: number]>; // a burst's last spike to the next burst's first
}

export interface Row {
  ticks: number[]; // January 1 of every year on the axis
  spikes: number[]; // left to right, each on a pixel center
  marker: number | null; // the ongoing role's marker, on the pixel center nearest the "now" end
}

/** The 32-bit FNV-1a hash of a string's UTF-8 bytes. */
export function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(text)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** The mulberry32 generator: each call returns the next number in [0, 1). */
export function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The year the axis starts in: the earliest start year among the entries. */
export function axisStartYear(starts: string[]): number {
  return Math.min(...starts.map((start) => Number(start.slice(0, 4))));
}

const newYear = (year: number) => Date.UTC(year, 0, 1);

// The first day of a YYYY-MM month, or of the month `offset` months later.
function monthStart(month: string, offset = 0): number {
  const [year, number] = month.split('-').map(Number);
  return Date.UTC(year, number - 1 + offset, 1);
}

function dayStart(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

/** Where a date (UTC milliseconds) sits on a row `width` px wide. */
export function dateToX(date: number, axis: Axis, width: number): number {
  const start = newYear(axis.startYear);
  return ((date - start) / (dayStart(axis.now) - start)) * width;
}

/**
 * One row's year marks, spikes, and marker at a given width. `left` is the
 * row's left end in px from the page's left edge, which is what the spikes
 * and the marker are lined up with the pixels by.
 */
export function rasterRow(role: Role, axis: Axis, width: number, pattern: Pattern, left = 0): Row {
  const now = dayStart(axis.now);
  const x = (date: number) => dateToX(Math.min(date, now), axis, width);

  const ticks: number[] = [];
  for (let year = axis.startYear; newYear(year) <= now; year++) ticks.push(x(newYear(year)));

  // Months are inclusive: a role runs from the first day of its start month
  // through the last day of its end month, so its spikes stop before the next
  // month starts. The ongoing role runs to "now", and its spikes stop at
  // least its schedule's smallest gap short of the marker there, so the
  // marker sits where the next burst would start and never reads as part of
  // one. Spacing is in whole pixels, so once the first spike is on a pixel
  // center the rest are too.
  const ongoing = role.end === 'present';
  const from = toPixelCenter(x(monthStart(role.start)), left);
  const marker = ongoing ? toPixelCenter(width, left) : null;
  const end = ongoing ? width : x(monthStart(role.end, 1));
  const [smallestGap] = pattern.gap[role.schedule];
  const fits = (spike: number) => (marker === null ? spike < end : spike <= marker - smallestGap);

  const random = mulberry32(fnv1a(`${role.start}|${role.end}|${role.schedule}`));
  const whole = ([min, max]: [number, number]) => min + Math.floor(random() * (max - min + 1));

  // Each burst's size, then the gap after it. A burst is placed only if all
  // of it fits, so a full-time row never ends on a lone spike; the first burst
  // that doesn't fit ends the row. An ongoing role too short for one burst
  // and the gap before its marker shows the marker alone.
  const spikes: number[] = [];
  let first = from;
  for (;;) {
    const size = whole(pattern.burst[role.schedule]);
    const gap = whole(pattern.gap[role.schedule]);
    const last = first + (size - 1) * pattern.pitch;
    if (!fits(last)) break;
    for (let i = 0; i < size; i++) spikes.push(first + i * pattern.pitch);
    first = last + gap;
  }

  return { ticks, spikes, marker };
}
