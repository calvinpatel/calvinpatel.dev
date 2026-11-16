// Draws the favicon files in public/ (DESIGN.md, Page head): the CP mark in the
// main text color on a true-black square with rounded corners. Run it again
// if the mark's colors or its place in the square change.
//
//   node scripts/favicon.mjs
//
//   public/favicon.svg            the mark on the rounded square
//   public/favicon.ico            the same at 16 and 32 px (PNG frames)
//   public/apple-touch-icon.png   180 px: a full square, because a phone rounds
//                                 the corners itself, with smaller letters
//
// A favicon can't read CSS, so the two colors are written into the files as
// numbers. They are read here from tokens.css, and tests/tokens.test.ts holds
// favicon.svg to them.
//
// No package is added for this: sharp, which Astro installs for its images,
// draws the SVG at each size.
import { readFileSync, writeFileSync } from 'node:fs';

import sharp from 'sharp';

import { tokenDeclared } from '../src/lib/tokens.ts';

const tokens = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const TEXT = tokenDeclared(tokens, '--color-text');
const BG = tokenDeclared(tokens, '--color-bg');
const PUBLIC = new URL('../public/', import.meta.url);

// The letters "CP" as outlines, so the icon needs no font. They were taken
// from the Fraunces file the site serves, shaped and drawn at the mark's own
// settings as the top bar sets it: weight 400, SOFT 100, WONK 1, optical size
// 22 (what "automatic" gives at --size-mark, 22px), and --display-tracking
// (-0.01em) between the letters. Laid over Chrome's drawing of the same text
// at 400px, they differ only in edge pixels.
//
// The path is in the font's units (2000 to the em), y down, with the baseline
// at 0. `left` and `right` are the ink's edges, and `capHeight` is Fraunces's.
const MARK = {
  left: 87.95,
  right: 2629.97,
  capHeight: 1400,
  d: [
    'M1318.86 -341.59Q1317.63 -288.02 1280.75 -223.05Q1243.87 -158.08 1175.22 -99.3Q1106.56 -40.52 1005.62 -2.74',
    'Q904.68 35.04 771.39 35.04Q560.55 35.04 407.34 -59.36Q254.13 -153.75 171.04 -319.05',
    'Q87.95 -484.34 87.95 -696.07Q87.95 -853.79 137.88 -987.56Q187.81 -1121.32 277.54 -1221.71',
    'Q367.26 -1322.11 487.75 -1377.08Q608.24 -1432.04 748.35 -1432.04Q850.87 -1432.04 914.7 -1411.64',
    'Q978.53 -1391.25 1014.89 -1370.92Q1051.25 -1350.59 1070.84 -1350.59Q1088.64 -1350.59 1099.73 -1367.69',
    'Q1110.82 -1384.79 1122.54 -1401.86Q1134.27 -1418.93 1155.68 -1418.93Q1178.13 -1418.93 1189.6 -1406.07',
    'Q1201.06 -1393.21 1211.13 -1362.07L1316.79 -1025.14Q1323.72 -998.34 1309.89 -978.81',
    'Q1296.06 -959.27 1270.13 -956.21Q1249.06 -954.14 1230.6 -964.6Q1212.13 -975.07 1200.2 -999.21',
    'Q1144.23 -1117.21 1078.62 -1187.07Q1013.01 -1256.93 934.12 -1287.79Q855.24 -1318.66 762.31 -1318.66',
    'Q666.24 -1318.66 586.27 -1275.66Q506.31 -1232.66 447.31 -1154.16Q388.31 -1075.66 355.84 -967.66',
    'Q323.37 -859.66 323.37 -732.52Q323.37 -543.59 390.57 -408.09Q457.76 -272.59 573.24 -199.62',
    'Q688.73 -126.66 833.05 -126.66Q969.27 -126.66 1068.56 -181.59Q1167.86 -236.52 1232.99 -341.62',
    'Q1250.93 -364.55 1265.86 -374.81Q1280.79 -385.07 1294.79 -381.07Q1306.99 -378.14 1313.03 -367.5',
    'Q1319.06 -356.86 1318.86 -341.59ZM2629.97 -901.14Q2629.97 -769.07 2565.28 -671',
    'Q2500.58 -572.93 2382.7 -519.43Q2264.82 -465.93 2105.64 -465.93Q2011.18 -465.93 1917.13 -486.4',
    'Q1823.07 -506.86 1752.42 -546.79L1768.35 -648.07Q1811.48 -622.73 1859.92 -607.19',
    'Q1908.35 -591.66 1957.51 -584.73Q2006.66 -577.79 2050.12 -577.79Q2153.64 -577.79 2232.26 -615.33',
    'Q2310.88 -652.86 2354.68 -726.47Q2398.47 -800.07 2398.47 -907.27Q2398.47 -1015.48 2346.71 -1100.12',
    'Q2294.95 -1184.75 2197.86 -1233.86Q2100.77 -1282.96 1965.39 -1282.96H1862.39V-214.29',
    'Q1862.39 -175.91 1880.94 -155.64Q1899.5 -135.38 1932.75 -127.45L2005.84 -111.59',
    'Q2029.77 -104.73 2042.21 -90.83Q2054.64 -76.93 2054.64 -54.79Q2054.64 -28.86 2038.24 -14.43',
    'Q2021.84 0 1989.05 0H1532.78Q1500.06 0 1483.63 -14.43Q1467.19 -28.86 1467.19 -54.73',
    'Q1467.19 -95.79 1515.92 -115.52L1560.95 -127.52Q1593.47 -137.45 1611.46 -156.71',
    'Q1629.44 -175.97 1629.44 -214.22V-1185.78Q1629.44 -1224.03 1611.46 -1243.29',
    'Q1593.47 -1262.55 1560.95 -1272.48L1515.85 -1284.48Q1467.19 -1304.27 1467.19 -1345.27',
    'Q1467.19 -1371.14 1483.63 -1385.57Q1500.06 -1400 1532.72 -1400H1973.32Q2183.29 -1400 2330.01 -1333.5',
    'Q2476.72 -1267 2553.34 -1154.57Q2629.97 -1042.14 2629.97 -901.14Z',
  ].join(''),
};

const n = (value) => +value.toFixed(3);

/** The letters `wide` units wide in a `box` square, centered; the cap height centered top to bottom. */
function letters(box, wide) {
  const scale = wide / (MARK.right - MARK.left);
  const x = (box - wide) / 2 - MARK.left * scale;
  const baseline = (box + MARK.capHeight * scale) / 2;
  return `<path fill="${TEXT}" transform="translate(${n(x)} ${n(baseline)}) scale(${+scale.toFixed(6)})" d="${MARK.d}"/>`;
}
const svg = (box, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box} ${box}">${body}</svg>\n`;

// In a 64-unit square: the corners' radius is 12, and the letters are 56 wide.
const icon = svg(64, `<rect width="64" height="64" rx="12" fill="${BG}"/>${letters(64, 56)}`);
// The touch icon: 180 units, no rounding, the letters 100 wide.
const touch = svg(180, `<rect width="180" height="180" fill="${BG}"/>${letters(180, 100)}`);

// Drawn at its own size, not scaled down from a larger one: `density` is the
// SVG's px per inch, and 72 draws one px per unit.
const png = (text, box, size) =>
  sharp(Buffer.from(text), { density: (72 * size) / box }).resize(size, size).png({ compressionLevel: 9 });

/** An .ico that holds PNG frames, which every browser that reads .ico accepts. */
function ico(frames) {
  const header = Buffer.alloc(6 + 16 * frames.length);
  header.writeUInt16LE(1, 2); // an icon
  header.writeUInt16LE(frames.length, 4);
  let offset = header.length;
  frames.forEach(({ size, data }, i) => {
    const at = 6 + 16 * i;
    header.writeUInt8(size, at); // width
    header.writeUInt8(size, at + 1); // height
    header.writeUInt16LE(1, at + 4); // color planes
    header.writeUInt16LE(32, at + 6); // bits per pixel
    header.writeUInt32LE(data.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...frames.map((frame) => frame.data)]);
}

const frames = [];
for (const size of [16, 32]) frames.push({ size, data: await png(icon, 64, size).toBuffer() });
const files = {
  'favicon.svg': Buffer.from(icon),
  'favicon.ico': ico(frames),
  'apple-touch-icon.png': await png(touch, 180, 180).flatten({ background: BG }).toBuffer(),
};
for (const [name, data] of Object.entries(files)) {
  writeFileSync(new URL(name, PUBLIC), data);
  console.log(`public/${name}: ${data.length.toLocaleString('en-US')} bytes`);
}
