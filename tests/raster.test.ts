// Tests for the Experience raster's pattern. Run from the repo root:
//   node --test tests/raster.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { axisStartYear, dateToX, fnv1a, mulberry32, rasterRow } from '../src/lib/raster.ts';
import type { Pattern, Role } from '../src/lib/raster.ts';

// The --raster-* tokens, as Raster.astro's script reads them.
const PATTERN: Pattern = {
  pitch: 4,
  burst: { 'full-time': [3, 4], 'part-time': [1, 2] },
  gap: { 'full-time': [11, 23], 'part-time': [22, 44] },
};

const AXIS = { startYear: 2020, now: '2026-11-10' };
const NOW = Date.UTC(2026, 10, 10);

// The six entries' raster fields, newest first.
const ROLES: Role[] = [
  { start: '2026-05', end: 'present', schedule: 'full-time' },
  { start: '2023-08', end: '2026-06', schedule: 'full-time' },
  { start: '2021-10', end: '2022-03', schedule: 'part-time' },
  { start: '2021-06', end: '2021-09', schedule: 'full-time' },
  { start: '2021-01', end: '2021-07', schedule: 'part-time' },
  { start: '2020-02', end: '2021-07', schedule: 'part-time' },
];

// A role across the whole axis, for a long run of bursts.
const LONG: Role[] = [
  { start: '2020-01', end: '2026-10', schedule: 'full-time' },
  { start: '2020-01', end: '2026-10', schedule: 'part-time' },
];

// Content widths: a 320px window, the 375px phone, 768px, and the full width.
const WIDTHS = [280, 335, 691.2, 1192];

// Float sums drift by a few 1e-13; positions only need to agree to far less
// than a pixel.
const EPSILON = 1e-6;
const near = (a: number, b: number) => Math.abs(a - b) < EPSILON;
// A role's start and the marker move this far at most, to reach a pixel center.
const HALF_PIXEL = 0.5;

// A role's dates as UTC milliseconds, worked out here rather than taken from
// the module: the first day of the start month to the end of the end month's
// last day.
function span(role: Role): [number, number] {
  const [startYear, startMonth] = role.start.split('-').map(Number);
  if (role.end === 'present') return [Date.UTC(startYear, startMonth - 1, 1), NOW];
  const [endYear, endMonth] = role.end.split('-').map(Number);
  return [Date.UTC(startYear, startMonth - 1, 1), Date.UTC(endYear, endMonth, 1)];
}

// Spikes one pitch apart belong to one burst.
function bursts(spikes: number[]): number[][] {
  const groups: number[][] = [];
  spikes.forEach((x, i) => {
    if (i > 0 && near(x - spikes[i - 1], PATTERN.pitch)) groups.at(-1)!.push(x);
    else groups.push([x]);
  });
  return groups;
}

const everyRow = (roles: Role[], check: (role: Role, width: number, row: ReturnType<typeof rasterRow>) => void) => {
  for (const role of roles) for (const width of WIDTHS) check(role, width, rasterRow(role, AXIS, width, PATTERN));
};

test('fnv1a matches the published 32-bit FNV-1a vectors', () => {
  assert.equal(fnv1a(''), 0x811c9dc5);
  assert.equal(fnv1a('a'), 0xe40c292c);
  assert.equal(fnv1a('foobar'), 0xbf9cf968);
});

test('mulberry32 repeats for a seed and stays in [0, 1)', () => {
  const a = mulberry32(1);
  assert.deepEqual([a(), a(), a()], [0.6270739405881613, 0.002735721180215478, 0.5274470399599522]);

  const b = mulberry32(fnv1a('2021-06|2021-09|full-time'));
  const c = mulberry32(fnv1a('2021-06|2021-09|full-time'));
  for (let i = 0; i < 1000; i++) {
    const value = b();
    assert.equal(value, c());
    assert.ok(value >= 0 && value < 1);
  }
});

test('the axis starts in the earliest start year', () => {
  assert.equal(axisStartYear(ROLES.map((role) => role.start)), 2020);
});

test('a date maps onto the axis from January 1 of the start year to now', () => {
  assert.equal(dateToX(Date.UTC(2020, 0, 1), AXIS, 1192), 0);
  assert.equal(dateToX(NOW, AXIS, 1192), 1192);
  const middle = (Date.UTC(2020, 0, 1) + NOW) / 2;
  assert.equal(dateToX(middle, AXIS, 1192), 596);
  assert.equal(dateToX(middle, AXIS, 335), 167.5);
});

test('year marks fall on January 1 of every year, including the first', () => {
  everyRow(ROLES, (_role, width, row) => {
    const years = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
    assert.deepEqual(
      row.ticks,
      years.map((year) => dateToX(Date.UTC(year, 0, 1), AXIS, width)),
    );
    assert.equal(row.ticks[0], 0);
  });
});

test('the same inputs always give the same spikes', () => {
  everyRow(ROLES, (role, width, row) => {
    assert.deepEqual(rasterRow({ ...role }, { ...AXIS }, width, PATTERN), row);
  });

  // Pinned, so a change to the hash, the generator, or the order of draws
  // shows. The role starts at 246.01px, which moves to the pixel center at
  // 246.5px; in a row that itself starts half a pixel across, to 246px.
  assert.deepEqual(rasterRow(ROLES[3], AXIS, 1192, PATTERN).spikes, [246.5, 250.5, 254.5, 269.5, 273.5, 277.5, 281.5]);
  assert.deepEqual(rasterRow(ROLES[3], AXIS, 1192, PATTERN, 116.5).spikes, [246, 250, 254, 269, 273, 277, 281]);
});

test('every spike and the marker sit on a pixel center, at most half a pixel from their dates', () => {
  // Where a row's left end can fall: on a pixel, half way, or anywhere.
  for (const left of [0, 0.5, 116.5, 37.65, 20.3]) {
    for (const role of ROLES) {
      for (const width of WIDTHS) {
        const { spikes, marker } = rasterRow(role, AXIS, width, PATTERN, left);
        const offCenter = (x: number) => Math.abs(((left + x) % 1) - HALF_PIXEL);
        for (const x of spikes) assert.ok(offCenter(x) < EPSILON, `a spike at ${left} + ${x}`);
        if (spikes.length > 0) assert.ok(Math.abs(spikes[0] - dateToX(span(role)[0], AXIS, width)) <= HALF_PIXEL + EPSILON);
        if (marker === null) continue;
        assert.ok(offCenter(marker) < EPSILON, `the marker at ${left} + ${marker}`);
        assert.ok(Math.abs(marker - width) <= HALF_PIXEL + EPSILON);
      }
    }
  }
});

test('roles with different dates or schedules get different patterns', () => {
  const offsets = (role: Role) => {
    const { spikes } = rasterRow(role, AXIS, 1192, PATTERN);
    return spikes.map((x) => Math.round(x - spikes[0]));
  };
  assert.notDeepEqual(offsets(LONG[0]), offsets({ ...LONG[0], end: '2026-09' }));
  assert.notDeepEqual(offsets(LONG[0]), offsets(LONG[1]));
});

test('burst sizes and gaps stay within their token ranges', () => {
  let gaps = 0;
  everyRow([...ROLES, ...LONG], (role, _width, row) => {
    const [sizeMin, sizeMax] = PATTERN.burst[role.schedule];
    const [gapMin, gapMax] = PATTERN.gap[role.schedule];
    const groups = bursts(row.spikes);
    groups.forEach((group, i) => {
      assert.ok(group.length >= sizeMin && group.length <= sizeMax, `a burst of ${group.length}`);
      if (i === 0) return;
      const gap = group[0] - groups[i - 1].at(-1)!;
      assert.ok(near(gap, Math.round(gap)), `a gap of ${gap}`);
      assert.ok(Math.round(gap) >= gapMin && Math.round(gap) <= gapMax, `a gap of ${gap}`);
      gaps += 1;
    });
  });
  assert.ok(gaps > 200); // the long roles give the ranges a real run
});

test('a long role uses every burst size and both ends of the gap range', () => {
  for (const role of LONG) {
    const groups = bursts(rasterRow(role, AXIS, 20000, PATTERN).spikes);
    const sizes = new Set(groups.map((group) => group.length));
    const gaps = new Set(groups.slice(1).map((group, i) => Math.round(group[0] - groups[i].at(-1)!)));
    const [sizeMin, sizeMax] = PATTERN.burst[role.schedule];
    const [gapMin, gapMax] = PATTERN.gap[role.schedule];
    for (let size = sizeMin; size <= sizeMax; size++) assert.ok(sizes.has(size), `no burst of ${size}`);
    assert.ok(gaps.has(gapMin) && gaps.has(gapMax));
  }
});

test("every spike falls inside its role's dates, months inclusive", () => {
  everyRow([...ROLES, ...LONG], (role, width, row) => {
    const [start, end] = span(role).map((date) => dateToX(date, AXIS, width));
    // Only the ongoing role can be too short to show a burst (tested below).
    if (row.spikes.length === 0) return assert.equal(role.end, 'present');
    // The first spike sits on the pixel center nearest the first day of the
    // start month, so it can fall up to half a pixel before it. No spike
    // passes the end.
    assert.ok(Math.abs(row.spikes[0] - start) <= HALF_PIXEL + EPSILON, `the first spike, ${row.spikes[0]}, is not at ${start}`);
    for (const x of row.spikes) assert.ok(x <= end + EPSILON, `${x} is past ${end}`);
  });
});

test('a role ending 2021-07 runs through July 31', () => {
  // One spike per burst and a fixed gap, so the last spike shows where the role ends.
  const single: Pattern = { pitch: 4, burst: { 'full-time': [1, 1], 'part-time': [1, 1] }, gap: { 'full-time': [1, 1], 'part-time': [1, 1] } };
  const role: Role = { start: '2021-01', end: '2021-07', schedule: 'part-time' };
  // A day is 100px wide here, so the day a spike falls on is easy to read.
  const days = (NOW - Date.UTC(2020, 0, 1)) / 86_400_000;
  const { spikes } = rasterRow(role, AXIS, days * 100, single);
  const dayOf = (x: number) => new Date(Date.UTC(2020, 0, 1) + (x / 100) * 86_400_000).toISOString().slice(0, 10);
  assert.equal(dayOf(spikes[0]), '2021-01-01');
  assert.equal(dayOf(spikes.at(-1)!), '2021-07-31');
});

test("the ongoing role's marker sits at the now end, its schedule's smallest gap or more past the last spike", () => {
  // The marker sits where the next burst would start, so it never reads as
  // part of a burst. Checked for both schedules, wherever the row's left end
  // falls.
  const ongoing: Role[] = [ROLES[0], { start: '2025-03', end: 'present', schedule: 'part-time' }];
  let rows = 0;
  for (const role of ongoing) {
    const [smallestGap] = PATTERN.gap[role.schedule];
    for (const left of [0, 0.5, 116.5, 37.65, 20.3]) {
      for (let width = 280; width <= 1192; width += 0.5) {
        const { spikes, marker } = rasterRow(role, AXIS, width, PATTERN, left);
        assert.ok(marker !== null && Math.abs(marker - width) <= HALF_PIXEL + EPSILON);
        if (spikes.length === 0) continue;
        assert.ok(marker - spikes.at(-1)! >= smallestGap - EPSILON, `${marker - spikes.at(-1)!}px before the marker at ${width}`);
        rows += 1;
      }
    }
  }
  assert.ok(rows > 15000);

  for (const role of ROLES.slice(1)) assert.equal(rasterRow(role, AXIS, 1192, PATTERN).marker, null);
});

test('a narrower row has fewer spikes at the same spacing', () => {
  for (const role of ROLES) {
    const offsets = (width: number) => {
      const { spikes } = rasterRow(role, AXIS, width, PATTERN);
      return spikes.map((x) => Math.round(x - spikes[0]));
    };
    const wide = offsets(1192);
    const narrow = offsets(335);
    assert.ok(narrow.length < wide.length);
    assert.deepEqual(narrow, wide.slice(0, narrow.length));
  }
});

const showsWholeBurst = (role: Role, width: number, axis = AXIS) => {
  const groups = bursts(rasterRow(role, axis, width, PATTERN).spikes);
  return groups.length >= 1 && groups[0].length >= PATTERN.burst[role.schedule][0];
};

test('every role shows at least one whole burst on a 375px phone', () => {
  for (const role of ROLES) assert.ok(showsWholeBurst(role, 335));
});

test('an ongoing role too short for a burst and the gap before its marker shows the marker alone', () => {
  // In a 320px window the row is 280px, and the ongoing role's six months are
  // under 22px of it: less than its first burst (12px) plus the smallest
  // full-time gap (11px).
  const row = rasterRow(ROLES[0], AXIS, 280, PATTERN);
  assert.deepEqual(row.spikes, []);
  assert.ok(row.marker !== null);
  // It fits once the role is a few weeks longer.
  assert.ok(showsWholeBurst(ROLES[0], 280, { ...AXIS, now: '2026-12-31' }));
  // The roles with an end date show a burst there today.
  for (const role of ROLES.slice(1)) assert.ok(showsWholeBurst(role, 280));
});
