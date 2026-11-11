// The Skills wiring diagram's geometry (DESIGN.md, Drawings: Wiring diagram):
// where every dot, label, and wire sits, in px from the diagram's top left
// corner. Wiring.astro's script draws what the two layouts return.
//
//   - The desktop layout is one diagram: skills on the left flow into their
//     groups in the middle, then out to the places they were used.
//   - The per-group layout is one small diagram per group, each skill wired
//     straight to its own places.
//   - Columns are fractions of the diagram's real width and rows are in px, so
//     nothing is scaled: a narrower diagram has shorter wires, not smaller
//     dots or text.
//   - Everything is lined up with the diagram's own whole pixels. A browser
//     paints an SVG's contents from the screen pixel nearest the SVG's corner
//     (measured in Chrome at device scale 1, 2, and 3), so a whole pixel in
//     the diagram is a whole pixel on the screen wherever the diagram falls
//     on the page.
//   - Each row moves to the nearest whole pixel. Its labels and its
//     even-sized dots are centered there, so a dot's edges land on whole
//     pixels. Its wire ends and its odd-sized dots sit on the pixel center
//     just below, half a pixel down, so a flat wire fills one row of pixels.
//     Every row then looks the same, at device scale 1, 2, and 3. Two ends on
//     the same row are exactly level, so the wire between them is flat.
//
// The numbers below are DESIGN.md's and the chosen artboards'. They are the
// drawing's own measurements, like an axon divider's path data, so they live
// here rather than in tokens.css. Sizes that are tokens come in through
// `sizes`, which the script fills from the --wire-* tokens.
//
// No DOM and no Astro imports, so Node can run tests/wiring.test.ts against it
// directly.

import { snapDot, toPixelEdge } from './pixels.ts';

/** The desktop diagram. Columns are fractions of its width; the rest is px. */
export const DESKTOP = {
  // The desktop diagram shows only where the longest skill label fits left of
  // this column: from 45rem of content (Skills.astro's container query).
  // That threshold is measured from today's longest skill label, "3D neuron
  // reconstruction", 149.2px at 13px: 149.2 / 0.21 = 710.3px, or 44.4rem. A
  // longer skill name in skills.md needs a higher threshold; in dev, the
  // script warns in the console when a label starts outside the content box.
  skillLabelEnd: 0.21, // skill labels are right-aligned and end here
  skillDot: 0.22,
  groupDot: 0.47,
  placeDot: 0.797,
  placeLabelStart: 0.81,
  firstRow: 30, // the first skill row, from the top
  roomBelow: 40, // below the last skill row (from the artboard)
  groupLabelRise: 12, // a group label's baseline, above its dot's center
  skillWire: { leave: 4, arrive: 8 }, // right of the skill dot, left of the group dot
  placeWire: { leave: 8, arrive: 10 }, // right of the group dot, left of the place dot
} as const;

/** One group's diagram, where the per-group layout shows. */
export const PHONE = {
  skillLabelEnd: 0.474,
  skillDot: 0.497,
  placeDot: 0.703,
  placeLabelStart: 0.731,
  wire: { leave: 3, arrive: 4 }, // right of the skill dot, left of the place dot (from the artboard)
} as const;

/**
 * A skill or place label's baseline, below its row, in em: the artboard's
 * 4.5px at 13px, which puts the row through the middle of the letters. In em
 * so it follows the text when a visitor enlarges it.
 */
export const LABEL_DROP_EM = 0.35;

/** skills.md's shape: the places, top to bottom, and the places each skill connects to. */
export interface Structure {
  places: string[]; // place ids
  groups: { skills: { places: string[] }[] }[];
}

/** The desktop diagram's tokens, as numbers. */
export interface DesktopSizes {
  row: number; // skill to skill: rowPitch()
  groupGap: number; // --wire-group-gap
  skillDot: number; // diameters
  groupDot: number;
  placeDot: number;
}

/** A group diagram's tokens, as numbers. */
export interface GroupSizes {
  row: number; // rowPitch()
  skillDot: number; // diameters
  placeDot: number;
}

/** The longest skill label and the longest place label in the per-group layout, in px. */
export interface Fit {
  skillLabel: number;
  placeLabel: number;
}

export interface Point {
  x: number;
  y: number;
}

/** A dot's center, and where its label is anchored: the label's end, start, or middle, on its row. */
export interface Node {
  dot: Point;
  label: Point;
}

export interface Wire {
  from: Point;
  to: Point;
}

export interface DesktopLayout {
  height: number;
  skills: Node[]; // in skills.md's order, across the groups
  groups: Node[];
  places: Node[];
  skillWires: Wire[]; // one per skill, in the same order
  placeWires: Wire[]; // in desktopPlaceWires' order
}

export interface GroupLayout {
  height: number;
  skills: Node[];
  places: Node[]; // in groupPlaces' order
  wires: Wire[]; // in groupWires' order
}

const NO_FIT: Fit = { skillLabel: 0, placeLabel: 0 };

/**
 * Skill to skill, in px: --wire-row, or one line of a label once a visitor
 * has enlarged text past it, so two rows' labels never overlap.
 */
export function rowPitch(wireRow: number, labelLine: number): number {
  return Math.max(wireRow, labelLine);
}

/** How many skill rows the desktop diagram has, and how many gaps between groups. */
export function desktopRows(structure: Structure): { rows: number; gaps: number } {
  return {
    rows: structure.groups.reduce((count, group) => count + group.skills.length, 0),
    gaps: structure.groups.length - 1,
  };
}

/** The places one group's skills connect to, in skills.md's order. */
export function groupPlaces(structure: Structure, group: number): string[] {
  const { skills } = structure.groups[group];
  return structure.places.filter((place) => skills.some((skill) => skill.places.includes(place)));
}

/** How many rows one group's own diagram has: its skills or its places, whichever is more. */
export function groupRows(structure: Structure, group: number): number {
  return Math.max(structure.groups[group].skills.length, groupPlaces(structure, group).length);
}

/** The desktop diagram's group-to-place wires: one per group and place it uses, group by group. */
export function desktopPlaceWires(structure: Structure): { group: number; place: string }[] {
  return structure.groups.flatMap((_, group) => groupPlaces(structure, group).map((place) => ({ group, place })));
}

/** One group diagram's wires: one per skill and place, skill by skill. `skill` counts within the group. */
export function groupWires(structure: Structure, group: number): { skill: number; place: string }[] {
  return structure.groups[group].skills.flatMap((skill, i) => skill.places.map((place) => ({ skill: i, place })));
}

/** A row, moved to the nearest whole pixel. Labels sit here. */
const rowEdge = (y: number) => toPixelEdge(y);

/** Where a row's wires end: the pixel center just below the row. */
const wireLine = (row: number) => row + 0.5;

// A dot's center on its column and its row, with its edges on whole pixels in
// both directions: on the row itself for an even diameter, and half a pixel
// down, level with the wires, for an odd one.
function dotAt(x: number, row: number, diameter: number): Point {
  return {
    x: snapDot(x, diameter),
    y: row + ((diameter / 2) % 1),
  };
}

// `count` rows `pitch` apart, centered on `middle`.
const centered = (count: number, pitch: number, middle: number) =>
  Array.from({ length: count }, (_, i) => middle + (i - (count - 1) / 2) * pitch);

/**
 * The desktop diagram at a given width. Skills sit `row` apart from the first
 * row down, with `groupGap` more between groups. Each group's dot is centered
 * on its skills, and the places are spread evenly from the first skill row to
 * the last.
 */
export function desktopLayout(structure: Structure, width: number, sizes: DesktopSizes): DesktopLayout {
  const skillRows: number[] = [];
  const groupRow: number[] = [];
  const groupOf: number[] = []; // each skill's group
  let y: number = DESKTOP.firstRow;
  structure.groups.forEach((group, g) => {
    const first = y;
    for (let i = 0; i < group.skills.length; i++) {
      skillRows.push(y);
      groupOf.push(g);
      y += sizes.row;
    }
    groupRow.push((first + y - sizes.row) / 2);
    y += sizes.groupGap;
  });
  const firstRow = skillRows[0];
  const lastRow = skillRows.at(-1)!;
  const step = structure.places.length > 1 ? (lastRow - firstRow) / (structure.places.length - 1) : 0;

  const column = (fraction: number) => fraction * width;

  const skillEdges = skillRows.map(rowEdge);
  const groupEdges = groupRow.map(rowEdge);
  const placeEdges = structure.places.map((_, i) => rowEdge(firstRow + i * step));

  const skills = skillEdges.map((row) => ({
    dot: dotAt(column(DESKTOP.skillDot), row, sizes.skillDot),
    label: { x: column(DESKTOP.skillLabelEnd), y: row },
  }));
  // A group's label is centered over its dot, its baseline above the dot's center.
  const groups = groupEdges.map((row) => {
    const dot = dotAt(column(DESKTOP.groupDot), row, sizes.groupDot);
    return { dot, label: { x: dot.x, y: dot.y - DESKTOP.groupLabelRise } };
  });
  const places = placeEdges.map((row) => ({
    dot: dotAt(column(DESKTOP.placeDot), row, sizes.placeDot),
    label: { x: column(DESKTOP.placeLabelStart), y: row },
  }));

  const skillWires = skills.map((skill, i) => ({
    from: { x: skill.dot.x + DESKTOP.skillWire.leave, y: wireLine(skillEdges[i]) },
    to: { x: groups[groupOf[i]].dot.x - DESKTOP.skillWire.arrive, y: wireLine(groupEdges[groupOf[i]]) },
  }));
  const placeWires = desktopPlaceWires(structure).map(({ group, place }) => {
    const p = structure.places.indexOf(place);
    return {
      from: { x: groups[group].dot.x + DESKTOP.placeWire.leave, y: wireLine(groupEdges[group]) },
      to: { x: places[p].dot.x - DESKTOP.placeWire.arrive, y: wireLine(placeEdges[p]) },
    };
  });

  return { height: lastRow + DESKTOP.roomBelow, skills, groups, places, skillWires, placeWires };
}

/**
 * The per-group layout's four columns at a given width, the same for every
 * group. Where the longest labels don't fit DESIGN.md's fractions, on a small
 * phone, the two columns move toward each other just far enough to keep those
 * labels inside the diagram. Each dot keeps its distance from its label.
 */
export function phoneColumns(width: number, fit = NO_FIT): { skillLabel: number; skillDot: number; placeDot: number; placeLabel: number } {
  const skillLabel = Math.max(PHONE.skillLabelEnd * width, fit.skillLabel);
  const placeLabel = Math.min(PHONE.placeLabelStart * width, width - fit.placeLabel);
  return {
    skillLabel,
    skillDot: skillLabel + (PHONE.skillDot - PHONE.skillLabelEnd) * width,
    placeDot: placeLabel - (PHONE.placeLabelStart - PHONE.placeDot) * width,
    placeLabel,
  };
}

/**
 * One group's own diagram at a given width: its skills on the left, each
 * wired straight to its own places on the right, with the skills and the
 * places each centered in the diagram's height.
 */
export function groupLayout(structure: Structure, group: number, width: number, sizes: GroupSizes, fit = NO_FIT): GroupLayout {
  const used = groupPlaces(structure, group);
  const height = groupRows(structure, group) * sizes.row;
  const columns = phoneColumns(width, fit);

  const skillEdges = centered(structure.groups[group].skills.length, sizes.row, height / 2).map(rowEdge);
  const placeEdges = centered(used.length, sizes.row, height / 2).map(rowEdge);

  const skills = skillEdges.map((row) => ({
    dot: dotAt(columns.skillDot, row, sizes.skillDot),
    label: { x: columns.skillLabel, y: row },
  }));
  const places = placeEdges.map((row) => ({
    dot: dotAt(columns.placeDot, row, sizes.placeDot),
    label: { x: columns.placeLabel, y: row },
  }));

  const wires = groupWires(structure, group).map(({ skill, place }) => {
    const p = used.indexOf(place);
    return {
      from: { x: skills[skill].dot.x + PHONE.wire.leave, y: wireLine(skillEdges[skill]) },
      to: { x: places[p].dot.x - PHONE.wire.arrive, y: wireLine(placeEdges[p]) },
    };
  });

  return { height, skills, places, wires };
}

/**
 * A wire's two control points: both at the horizontal midpoint, each level
 * with its own end, so the wire leaves and arrives horizontally.
 */
export function wireControls({ from, to }: Wire): [Point, Point] {
  const middle = (from.x + to.x) / 2;
  return [
    { x: middle, y: from.y },
    { x: middle, y: to.y },
  ];
}

/** A position as an SVG attribute's value, to a thousandth of a pixel. */
export const px = (value: number) => String(Math.round(value * 1000) / 1000);

/**
 * A wire as SVG path data: one cubic curve. A wire whose ends are level comes
 * out flat. That is the same curve, not a special case.
 */
export function wirePath(wire: Wire): string {
  const { from, to } = wire;
  const [c1, c2] = wireControls(wire);
  return `M${px(from.x)} ${px(from.y)}C${px(c1.x)} ${px(c1.y)} ${px(c2.x)} ${px(c2.y)} ${px(to.x)} ${px(to.y)}`;
}
