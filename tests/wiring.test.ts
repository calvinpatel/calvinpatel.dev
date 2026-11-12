// Tests for the Skills wiring diagram's geometry and its traced paths. Run
// from the repo root:
//   node --test tests/wiring.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  DESKTOP,
  PHONE,
  desktopLayout,
  desktopPlaceWires,
  desktopRows,
  desktopTargets,
  groupLayout,
  groupPlaces,
  groupRows,
  groupTarget,
  groupWires,
  phoneColumns,
  rowPitch,
  tracePath,
  wireControls,
  wirePath,
} from '../src/lib/wiring.ts';
import type { DesktopSizes, Fit, GroupSizes, Structure, Target } from '../src/lib/wiring.ts';

// skills.md's shape: the seven places, and each skill's places, group by group.
const np = 'notepilot';
const cp = 'coastal-pain';
const ms = 'medical-school';
const at = 'atelier-health';
const cs = 'cedars-sinai';
const yl = 'yang-lab';
const ml = 'mehta-lab';
const group = (...skills: string[][]) => ({ skills: skills.map((places) => ({ places })) });
const STRUCTURE: Structure = {
  places: [np, cp, ms, at, cs, yl, ml],
  groups: [
    group([np], [cs, ml], [np], [np], [np], [np]), // Languages
    group([np], [np, cp], [np], [np]), // AI / LLM
    group([np], [np], [np], [np], [np], [np], [np], [np]), // Backend
    group([np], [np]), // Frontend
    group([np], [np], [np]), // Testing and quality
    group([np], [np], [np], [np], [np], [np]), // Infrastructure and tools
    group([cs]), // Scientific computing
    group([ml], [ml, cs], [yl]), // Neuroscience methods
    group([at, np, cp], [at], [ms, cp], [cp, np]), // Clinical
  ],
};
const GROUPS = STRUCTURE.groups.map((_, g) => g);

// The --wire-* tokens, as Wiring.astro's script reads them.
const DESKTOP_SIZES: DesktopSizes = { row: 22, groupGap: 12, skillDot: 6, groupDot: 10, placeDot: 12 };
const GROUP_SIZES: GroupSizes = { row: 22, skillDot: 5, placeDot: 8 };

// The longest skill and place labels at 13px, from IBM Plex Sans's advance
// widths: "3D neuron reconstruction" and "Medical school".
const FIT: Fit = { skillLabel: 149.17, placeLabel: 86.92 };

// Content widths: a 320px window, the 375px phone, the phone artboard, a 768px
// window, and where the per-group layout ends; then where the desktop layout
// starts, a 1024px window, and the full width. Between 400px and 1280px the
// gutters are 5% of the window, so most content widths aren't whole pixels.
const PHONE_WIDTHS = [280, 335, 350, 691.2, 719.1];
const DESKTOP_WIDTHS = [720, 921.6, 1192];

// Rows 22px apart, and the 36.4px rows of text at 200%, which don't fall on
// whole pixels.
const ROWS = [22, 36.4];

// Float sums drift by a few 1e-13; positions only need to agree to far less
// than a pixel.
const EPSILON = 1e-6;
const near = (a: number, b: number) => Math.abs(a - b) < EPSILON;
const HALF_PIXEL = 0.5;
// How far a page position is from the nearest whole pixel.
const offEdge = (x: number) => Math.abs(x - Math.round(x));

// The desktop rows, worked out here rather than taken from the module.
function expectedRows(row = 22, gap = 12) {
  const skills: number[] = [];
  const groups: number[] = [];
  let y = 30;
  for (const { skills: own } of STRUCTURE.groups) {
    const first = y;
    for (let i = 0; i < own.length; i++, y += row) skills.push(y);
    groups.push((first + y - row) / 2);
    y += gap;
  }
  return { skills, groups };
}

test("the counts match skills.md's", () => {
  assert.deepEqual(desktopRows(STRUCTURE), { rows: 37, gaps: 8 });
  assert.equal(desktopPlaceWires(STRUCTURE).length, 17);

  const desktop = desktopLayout(STRUCTURE, 1192, DESKTOP_SIZES);
  assert.equal(desktop.skills.length, 37);
  assert.equal(desktop.groups.length, 9);
  assert.equal(desktop.places.length, 7);
  assert.equal(desktop.skillWires.length + desktop.placeWires.length, 54);

  const perGroup = GROUPS.map((g) => groupLayout(STRUCTURE, g, 350, GROUP_SIZES).wires.length);
  assert.deepEqual(perGroup, [7, 5, 8, 2, 3, 6, 1, 4, 8]);
  assert.equal(
    perGroup.reduce((a, b) => a + b),
    44,
  );
});

test('a row is --wire-row, or one label line once that is taller', () => {
  assert.equal(rowPitch(22, 18.2), 22); // default text
  assert.equal(rowPitch(22, 36.4), 36.4); // text at 200%
});

test('desktop rows start 30px down, 22px apart, with 12px more between groups', () => {
  const { skills, places, height } = desktopLayout(STRUCTURE, 1192, DESKTOP_SIZES);
  const rows = expectedRows();
  assert.deepEqual(
    skills.map((skill) => skill.dot.y),
    rows.skills,
  );
  assert.equal(skills[0].dot.y, 30);
  assert.equal(skills[5].dot.y, 140); // the last of Languages
  assert.equal(skills[6].dot.y, 174); // the first of AI / LLM: a row and the gap further
  assert.equal(skills.at(-1)!.dot.y, 918);
  // 40px of room below the last row.
  assert.equal(height, 958);
  assert.equal(places.at(-1)!.dot.y, 918);
});

test('desktop columns are fractions of the width', () => {
  // On the 1192px artboard the dots land on 262, 560, and 950.
  const { skills, groups, places } = desktopLayout(STRUCTURE, 1192, DESKTOP_SIZES);
  for (const skill of skills) {
    assert.equal(skill.dot.x, 262);
    assert.ok(near(skill.label.x, 0.21 * 1192));
  }
  for (const group of groups) assert.equal(group.dot.x, 560);
  for (const place of places) {
    assert.equal(place.dot.x, 950);
    assert.ok(near(place.label.x, 0.81 * 1192));
  }

  for (const width of DESKTOP_WIDTHS) {
    const layout = desktopLayout(STRUCTURE, width, DESKTOP_SIZES);
    assert.ok(Math.abs(layout.skills[0].dot.x - 0.22 * width) <= HALF_PIXEL);
    assert.ok(Math.abs(layout.groups[0].dot.x - 0.47 * width) <= HALF_PIXEL);
    assert.ok(Math.abs(layout.places[0].dot.x - 0.797 * width) <= HALF_PIXEL);
  }
});

test("each group's dot is centered on its skills, with its label's baseline 12px above", () => {
  const { groups } = desktopLayout(STRUCTURE, 1192, DESKTOP_SIZES);
  const rows = expectedRows();
  assert.deepEqual(
    groups.map((group) => group.dot.y),
    rows.groups,
  );
  assert.equal(groups[0].dot.y, 85); // Languages: six skills, 30 to 140
  assert.equal(groups[6].dot.y, rows.skills[29]); // Scientific computing: level with its one skill
  for (const group of groups) {
    assert.equal(group.label.x, group.dot.x);
    assert.equal(group.label.y, group.dot.y - 12);
  }
});

test('places are spread evenly from the first skill row to the last', () => {
  const { places } = desktopLayout(STRUCTURE, 1192, DESKTOP_SIZES);
  assert.deepEqual(
    places.map((place) => place.dot.y),
    [30, 178, 326, 474, 622, 770, 918],
  );
});

test('a skill or place label sits on its row, level with an even dot', () => {
  const desktop = desktopLayout(STRUCTURE, 1192, DESKTOP_SIZES);
  for (const node of [...desktop.skills, ...desktop.places]) assert.equal(node.label.y, node.dot.y);
  // A phone's 5px skill dot is half a pixel down, level with the wires.
  const phone = groupLayout(STRUCTURE, 0, 350, GROUP_SIZES);
  for (const skill of phone.skills) assert.equal(skill.label.y, skill.dot.y - 0.5);
  for (const place of phone.places) assert.equal(place.label.y, place.dot.y);
});

test('desktop wires leave and arrive at the offsets DESIGN.md gives', () => {
  for (const width of DESKTOP_WIDTHS) {
    const { skills, groups, places, skillWires, placeWires } = desktopLayout(STRUCTURE, width, DESKTOP_SIZES);
    const groupOf = STRUCTURE.groups.flatMap((group, g) => group.skills.map(() => g));
    skillWires.forEach((wire, i) => {
      assert.equal(wire.from.x, skills[i].dot.x + 4);
      assert.equal(wire.to.x, groups[groupOf[i]].dot.x - 8);
      assert.equal(wire.from.y, skills[i].dot.y + 0.5);
      assert.equal(wire.to.y, groups[groupOf[i]].dot.y + 0.5);
    });
    desktopPlaceWires(STRUCTURE).forEach(({ group, place }, i) => {
      const to = places[STRUCTURE.places.indexOf(place)];
      assert.equal(placeWires[i].from.x, groups[group].dot.x + 8);
      assert.equal(placeWires[i].to.x, to.dot.x - 10);
      assert.equal(placeWires[i].from.y, groups[group].dot.y + 0.5);
      assert.equal(placeWires[i].to.y, to.dot.y + 0.5);
    });
  }
});

test('each group connects once to each place its skills use, in the order of the places', () => {
  assert.deepEqual(groupPlaces(STRUCTURE, 0), [np, cs, ml]);
  assert.deepEqual(groupPlaces(STRUCTURE, 7), [cs, yl, ml]);
  assert.deepEqual(groupPlaces(STRUCTURE, 8), [np, cp, ms, at]);
  assert.deepEqual(desktopPlaceWires(STRUCTURE).slice(0, 5), [
    { group: 0, place: np },
    { group: 0, place: cs },
    { group: 0, place: ml },
    { group: 1, place: np },
    { group: 1, place: cp },
  ]);
  // Every pair is real: some skill in the group lists the place.
  for (const { group, place } of desktopPlaceWires(STRUCTURE)) {
    assert.ok(STRUCTURE.groups[group].skills.some((skill) => skill.places.includes(place)));
  }
});

test('a wire is one curve that leaves and arrives horizontally, bending at the midpoint', () => {
  const { skillWires, placeWires } = desktopLayout(STRUCTURE, 1192, DESKTOP_SIZES);
  for (const wire of [...skillWires, ...placeWires, ...GROUPS.flatMap((g) => groupLayout(STRUCTURE, g, 350, GROUP_SIZES).wires)]) {
    const [c1, c2] = wireControls(wire);
    assert.equal(c1.x, (wire.from.x + wire.to.x) / 2);
    assert.equal(c2.x, c1.x);
    assert.equal(c1.y, wire.from.y);
    assert.equal(c2.y, wire.to.y);
    assert.ok(wire.to.x > wire.from.x);
  }
  // The first skill's wire on the artboard: 266 to 552, bending at 409.
  assert.equal(wirePath(skillWires[0]), 'M266 30.5C409 30.5 409 85.5 552 85.5');
});

test('a wire whose ends are level is flat', () => {
  // Scientific computing has one skill, level with its group's dot: 29 rows
  // and 6 group gaps down, at 30 + 29 × 22 + 6 × 12 = 740.
  const { skillWires } = desktopLayout(STRUCTURE, 1192, DESKTOP_SIZES);
  const [c1, c2] = wireControls(skillWires[29]);
  assert.equal(skillWires[29].from.y, skillWires[29].to.y);
  assert.equal(c1.y, c2.y);
  assert.equal(wirePath(skillWires[29]), 'M266 740.5C409 740.5 409 740.5 552 740.5');

  // On phones, at either row height: a skill and a place on the same row have
  // dots of different sizes, and the wire between them is still flat.
  for (const row of ROWS) {
    let flat = 0;
    for (const g of GROUPS) {
      const { skills, places, wires } = groupLayout(STRUCTURE, g, 335, { ...GROUP_SIZES, row }, FIT);
      const used = groupPlaces(STRUCTURE, g);
      groupWires(STRUCTURE, g).forEach(({ skill, place }, i) => {
        if (!near(skills[skill].label.y, places[used.indexOf(place)].label.y)) return;
        assert.equal(wires[i].from.y, wires[i].to.y);
        flat += 1;
      });
    }
    assert.equal(flat, 5); // one each in AI / LLM, Testing and quality, and Scientific computing, and two in Clinical
  }
});

test("a group's own diagram is its rows tall, with its skills and its places each centered", () => {
  assert.deepEqual(GROUPS.map((g) => groupRows(STRUCTURE, g)), [6, 4, 8, 2, 3, 6, 1, 3, 4]);

  // Languages: six skills, three places.
  const languages = groupLayout(STRUCTURE, 0, 350, GROUP_SIZES);
  assert.equal(languages.height, 132);
  assert.deepEqual(
    languages.skills.map((skill) => skill.label.y),
    [11, 33, 55, 77, 99, 121],
  );
  assert.deepEqual(
    languages.places.map((place) => place.dot.y),
    [44, 66, 88],
  );

  // Frontend: two skills, one place half way between them.
  const frontend = groupLayout(STRUCTURE, 3, 350, GROUP_SIZES);
  assert.equal(frontend.height, 44);
  assert.deepEqual(
    frontend.places.map((place) => place.dot.y),
    [22],
  );

  // A group with more places than skills is as tall as its places.
  const wide: Structure = { places: ['a', 'b', 'c'], groups: [group(['a', 'b', 'c'])] };
  const layout = groupLayout(wide, 0, 350, GROUP_SIZES);
  assert.equal(layout.height, 66);
  assert.deepEqual(
    layout.skills.map((skill) => skill.label.y),
    [33],
  );
});

test("a group's own diagram wires each skill straight to its own places", () => {
  // Clinical: [atelier, notepilot, coastal], [atelier], [medical school, coastal], [coastal, notepilot].
  assert.deepEqual(groupWires(STRUCTURE, 8), [
    { skill: 0, place: at },
    { skill: 0, place: np },
    { skill: 0, place: cp },
    { skill: 1, place: at },
    { skill: 2, place: ms },
    { skill: 2, place: cp },
    { skill: 3, place: cp },
    { skill: 3, place: np },
  ]);
  for (const g of GROUPS) {
    const { skills, places, wires } = groupLayout(STRUCTURE, g, 350, GROUP_SIZES);
    const used = groupPlaces(STRUCTURE, g);
    assert.equal(places.length, used.length);
    groupWires(STRUCTURE, g).forEach(({ skill, place }, i) => {
      const to = places[used.indexOf(place)];
      // 3px right of the skill dot's center and 4px left of the place dot's.
      assert.equal(wires[i].from.x, skills[skill].dot.x + 3);
      assert.equal(wires[i].to.x, to.dot.x - 4);
      assert.equal(wires[i].from.y, skills[skill].label.y + 0.5);
      assert.equal(wires[i].to.y, to.label.y + 0.5);
    });
  }
});

test('phone columns are fractions of the width where the longest labels fit', () => {
  // The 350px artboard: labels end at 166 and start at 256, dots at 174 and 246.
  const artboard = phoneColumns(350, FIT);
  assert.ok(near(artboard.skillLabel, 165.9));
  assert.ok(near(artboard.skillDot, 173.95));
  assert.ok(near(artboard.placeDot, 246.05));
  assert.ok(near(artboard.placeLabel, 255.85));

  // No shift on the 375px phone or wider.
  for (const width of [335, 350, 719]) {
    assert.deepEqual(phoneColumns(width, FIT), phoneColumns(width));
    assert.ok(near(phoneColumns(width).skillLabel, PHONE.skillLabelEnd * width));
  }
});

test('on a small phone the two columns move just far enough to fit the longest labels', () => {
  // A 320px window: 280px of content.
  const columns = phoneColumns(280, FIT);
  // The longest skill label starts at the left edge and the longest place
  // label ends at the right edge.
  assert.equal(columns.skillLabel, FIT.skillLabel);
  assert.equal(columns.placeLabel, 280 - FIT.placeLabel);
  // Each dot keeps DESIGN.md's distance from its label.
  assert.ok(near(columns.skillDot - columns.skillLabel, (0.497 - 0.474) * 280));
  assert.ok(near(columns.placeLabel - columns.placeDot, (0.731 - 0.703) * 280));
  // The wires still have room: about 23px of the unshifted 51px.
  const run = columns.placeDot - PHONE.wire.arrive - (columns.skillDot + PHONE.wire.leave);
  assert.ok(run > 22 && run < 23, `a wire ${run}px long`);

  // One side can shift without the other: a 360px window fits the skill
  // labels and misses the longest place label by under a pixel.
  const at360 = phoneColumns(320, FIT);
  assert.ok(near(at360.skillLabel, 0.474 * 320));
  assert.equal(at360.placeLabel, 320 - FIT.placeLabel);
  assert.ok(0.731 * 320 - at360.placeLabel < 1);
});

test('every group shares the same columns at a width', () => {
  for (const width of PHONE_WIDTHS) {
    const layouts = GROUPS.map((g) => groupLayout(STRUCTURE, g, width, GROUP_SIZES, FIT));
    const columns = phoneColumns(width, FIT);
    for (const layout of layouts) {
      for (const skill of layout.skills) {
        assert.equal(skill.label.x, columns.skillLabel);
        assert.equal(skill.dot.x, layouts[0].skills[0].dot.x);
        assert.ok(Math.abs(skill.dot.x - columns.skillDot) <= HALF_PIXEL + EPSILON);
        // The longest label stays inside the diagram.
        assert.ok(skill.label.x - FIT.skillLabel >= -EPSILON);
      }
      for (const place of layout.places) {
        assert.equal(place.label.x, columns.placeLabel);
        assert.equal(place.dot.x, layouts[0].places[0].dot.x);
        assert.ok(Math.abs(place.dot.x - columns.placeDot) <= HALF_PIXEL + EPSILON);
        assert.ok(place.label.x + FIT.placeLabel <= width + EPSILON);
      }
    }
  }
});

test("every dot's edges land on the diagram's whole pixels", () => {
  const check = (dots: { x: number; y: number }[], diameter: number) => {
    for (const dot of dots) {
      for (const edge of [-diameter / 2, diameter / 2]) {
        assert.ok(offEdge(dot.x + edge) < EPSILON, `a ${diameter}px dot at x ${dot.x}`);
        assert.ok(offEdge(dot.y + edge) < EPSILON, `a ${diameter}px dot at y ${dot.y}`);
      }
    }
  };
  for (const row of ROWS) {
    for (const width of DESKTOP_WIDTHS) {
      const layout = desktopLayout(STRUCTURE, width, { ...DESKTOP_SIZES, row });
      check(layout.skills.map((node) => node.dot), DESKTOP_SIZES.skillDot);
      check(layout.groups.map((node) => node.dot), DESKTOP_SIZES.groupDot);
      check(layout.places.map((node) => node.dot), DESKTOP_SIZES.placeDot);
    }
    for (const width of PHONE_WIDTHS) {
      for (const g of GROUPS) {
        const layout = groupLayout(STRUCTURE, g, width, { ...GROUP_SIZES, row }, FIT);
        check(layout.skills.map((node) => node.dot), GROUP_SIZES.skillDot);
        check(layout.places.map((node) => node.dot), GROUP_SIZES.placeDot);
      }
    }
  }
});

test('every wire end is on a pixel center, and each row moves at most half a pixel', () => {
  for (const row of ROWS) {
    const rows = expectedRows(row);
    const { skills, groups, skillWires, placeWires } = desktopLayout(STRUCTURE, 921.6, { ...DESKTOP_SIZES, row });
    for (const wire of [...skillWires, ...placeWires]) {
      for (const end of [wire.from, wire.to]) assert.ok(near(offEdge(end.y), HALF_PIXEL), `a wire end at ${end.y}`);
    }
    // A label and an even dot stay within half a pixel of the row DESIGN.md
    // gives; the wire's end is half a pixel below them.
    skills.forEach((skill, i) => {
      assert.ok(Math.abs(skill.label.y - rows.skills[i]) <= HALF_PIXEL + EPSILON);
      assert.equal(skillWires[i].from.y, skill.label.y + 0.5);
    });
    groups.forEach((group, i) => assert.ok(Math.abs(group.dot.y - rows.groups[i]) <= HALF_PIXEL + EPSILON));

    for (const g of GROUPS) {
      for (const wire of groupLayout(STRUCTURE, g, 691.2, { ...GROUP_SIZES, row }, FIT).wires) {
        for (const end of [wire.from, wire.to]) assert.ok(near(offEdge(end.y), HALF_PIXEL));
      }
    }
  }
});

// --- Tracing -------------------------------------------------------------------

// Skills are numbered down the whole diagram: Languages is 0 to 5, AI / LLM
// 6 to 9, and Clinical 33 to 36. A place wire is its position in
// desktopPlaceWires: Languages' three are 0 to 2, AI / LLM's two are 3 and 4,
// and Clinical's four are 13 to 16.
const SKILLS = STRUCTURE.groups.flatMap((entry, g) => entry.skills.map((skill) => ({ group: g, places: skill.places })));

test('a skill lights its wire, its group, and only the wires to the places it was used', () => {
  // MATLAB: Cedars-Sinai and the Mehta Lab, never Languages → NotePilot.
  assert.deepEqual(tracePath(STRUCTURE, { skill: 1 }), {
    skills: [1],
    groups: [0],
    places: [cs, ml],
    skillWires: [1],
    placeWires: [1, 2],
  });
});

test('a group lights all its skills, all its wires out, and all its places', () => {
  assert.deepEqual(tracePath(STRUCTURE, { group: 8 }), {
    skills: [33, 34, 35, 36],
    groups: [8],
    places: [np, cp, ms, at],
    skillWires: [33, 34, 35, 36],
    placeWires: [13, 14, 15, 16],
  });
});

test("a place lights every skill used there, their groups, and only those groups' wires to it", () => {
  // Coastal Pain: Prompt engineering, Clinical documentation, Clinical
  // knowledge, and PHI handling; AI / LLM and Clinical; their two wires to it.
  assert.deepEqual(tracePath(STRUCTURE, { place: cp }), {
    skills: [7, 33, 35, 36],
    groups: [1, 8],
    places: [cp],
    skillWires: [7, 33, 35, 36],
    placeWires: [4, 14],
  });
});

test('every traced path is made of real connections', () => {
  const targets: Target[] = [
    ...SKILLS.map((_, skill) => ({ skill })),
    ...GROUPS.map((g) => ({ group: g })),
    ...STRUCTURE.places.map((place) => ({ place })),
  ];
  assert.equal(targets.length, 53);
  const placeWires = desktopPlaceWires(STRUCTURE);

  for (const target of targets) {
    const path = tracePath(STRUCTURE, target);
    const name = JSON.stringify(target);

    // Every target lights itself.
    if ('skill' in target) assert.ok(path.skills.includes(target.skill), name);
    else if ('group' in target) assert.ok(path.groups.includes(target.group), name);
    else assert.ok(path.places.includes(target.place), name);

    // A lit skill brings its wire and its group, and every lit group has a lit skill.
    assert.deepEqual(path.skillWires, path.skills, name);
    for (const skill of path.skills) assert.ok(path.groups.includes(SKILLS[skill].group), name);
    for (const g of path.groups) assert.ok(path.skills.some((skill) => SKILLS[skill].group === g), name);

    // Every lit group-to-place wire joins a lit group to a lit place, and a
    // lit skill of that group was used at that place.
    for (const i of path.placeWires) {
      const wire = placeWires[i];
      assert.ok(path.groups.includes(wire.group), name);
      assert.ok(path.places.includes(wire.place), name);
      assert.ok(
        path.skills.some((skill) => SKILLS[skill].group === wire.group && SKILLS[skill].places.includes(wire.place)),
        `${name}: no lit skill runs through wire ${i}`,
      );
    }
    // And every lit place is reached by a lit wire.
    for (const place of path.places) assert.ok(path.placeWires.some((i) => placeWires[i].place === place), name);

    if ('place' in target) {
      // A place lights no other place, though its skills may be used elsewhere.
      assert.deepEqual(path.places, [target.place], name);
    } else {
      // From a skill or a group, every lit skill's places are lit.
      for (const skill of path.skills) {
        for (const place of SKILLS[skill].places) assert.ok(path.places.includes(place), name);
      }
    }
  }
});

test("a skill's hover row runs from the left edge to its wire's start, one row tall", () => {
  const layout = desktopLayout(STRUCTURE, 1192, DESKTOP_SIZES);
  const { skills } = desktopTargets(layout, 1192, { row: 22, placeLine: 21 });
  assert.equal(skills.length, 37);
  skills.forEach((box, i) => {
    assert.equal(box.x, 0);
    assert.equal(box.width, layout.skillWires[i].from.x);
    assert.equal(box.height, 22);
    assert.equal(box.y + box.height / 2, layout.skills[i].dot.y);
  });
  assert.deepEqual(skills[0], { x: 0, y: 19, width: 266, height: 22 });
  // Rows in a group meet with no overlap, and the gap between groups is blank.
  assert.equal(skills[1].y, skills[0].y + 22);
  assert.equal(skills[6].y - (skills[5].y + 22), 12);
});

test("a place's hover row runs from its wires' end to the right edge, as tall as a row or its label's line", () => {
  for (const width of DESKTOP_WIDTHS) {
    const layout = desktopLayout(STRUCTURE, width, DESKTOP_SIZES);
    const { places } = desktopTargets(layout, width, { row: 22, placeLine: 21 });
    desktopPlaceWires(STRUCTURE).forEach(({ place }, i) => {
      assert.equal(places[STRUCTURE.places.indexOf(place)].x, layout.placeWires[i].to.x);
    });
    places.forEach((box, i) => {
      assert.ok(near(box.x + box.width, width));
      assert.equal(box.height, 22);
      assert.equal(box.y + box.height / 2, layout.places[i].dot.y);
    });
  }
  // Text at 200%: a place label's line is taller than a row.
  const layout = desktopLayout(STRUCTURE, 1192, { ...DESKTOP_SIZES, row: 36.4 });
  const { skills, places } = desktopTargets(layout, 1192, { row: 36.4, placeLine: 42 });
  assert.equal(skills[0].height, 36.4);
  places.forEach((box, i) => {
    assert.equal(box.height, 42);
    assert.ok(near(box.y + 21, layout.places[i].dot.y));
  });
});

test("a group's hover target runs from the top of its label to the bottom of its dot", () => {
  // A label 60px wide and 18px tall, centered over a 10px dot at (560, 85).
  assert.deepEqual(groupTarget({ x: 530, y: 59, width: 60, height: 18 }, { x: 560, y: 85 }, 10), {
    x: 530,
    y: 59,
    width: 60,
    height: 31,
  });
  // A label narrower than its dot: as wide as the dot.
  assert.deepEqual(groupTarget({ x: 557, y: 59, width: 6, height: 18 }, { x: 560, y: 85 }, 10), {
    x: 555,
    y: 59,
    width: 10,
    height: 31,
  });
});
