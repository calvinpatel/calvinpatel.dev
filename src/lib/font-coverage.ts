// The build's font check: every character a page draws must be in the font
// file that draws it. astro.config.mjs runs it when the build finishes, over
// the pages as built, and a character with no glyph stops the build.
//
// Why: the fonts are subsets. The providers' "latin" files hold ↑ and ↓ but
// no →, and Fraunces holds no arrows at all. A character the file lacks is
// drawn by a fallback font on the visitor's machine, in another design. This
// catches it on the day it is written, not after it ships.
//
// Three parts, each on its own so Node can test it (tests/font-coverage.test.ts):
//   woff2Codepoints  the characters a .woff2 file holds, from its character map
//   servedFaces      the faces a built page declares (@font-face), with their files
//   drawnCharacters  every character in a built page, by the face that draws it
//
// drawnCharacters works from the page's HTML alone, with no browser, so it
// restates the site's few font rules (global.css; DESIGN.md, Type):
//   - Fraunces for h1, h2, h3, and .display; Plex for everything else,
//     .group-name included (Skills sets that heading back to Plex)
//   - Plex italic inside <em>, and Plex 500 for a brain label's .name
//   - a list with markers draws them in Plex: a bullet, or a number and a stop
// A new rule that changes a family, weight, or style belongs here too.
//
// No Astro imports. Build time only: it uses Node's zlib.
import { brotliDecompressSync } from 'node:zlib';

// --- The characters a .woff2 file holds --------------------------------------

/** WOFF2 writes most table lengths as a number of 7-bit groups, high bit set on all but the last. */
function readBase128(bytes: Uint8Array, at: number): { value: number; next: number } {
  let value = 0;
  for (let i = 0; i < 5; i++) {
    const byte = bytes[at + i];
    value = value * 128 + (byte & 0x7f);
    if ((byte & 0x80) === 0) return { value, next: at + i + 1 };
  }
  throw new Error('A table length in the font file runs past five bytes.');
}

// In a WOFF2 table directory a table is named by its place in a fixed list;
// these are the four places that matter here.
const CMAP = 0;
const HMTX = 3;
const GLYF = 10;
const LOCA = 11;
const OTHER_TAG = 63; // the table's four-letter name follows instead

/** The font's `cmap` table, from a WOFF2 file's bytes. */
function cmapTable(file: Uint8Array): Uint8Array {
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  if (file.length < 48 || view.getUint32(0) !== 0x774f4632) throw new Error("This isn't a WOFF2 font file.");
  if (view.getUint32(4) === 0x74746366) throw new Error('A WOFF2 font collection holds several fonts; this reads one.');
  const tables = view.getUint16(12);
  const compressed = view.getUint32(20);

  // The directory: each table's name and its length in the data that follows.
  // glyf and loca are stored transformed unless their flag says otherwise,
  // and hmtx only when its flag says so; a transformed table gives a second
  // length, which is the one it takes up.
  let at = 48;
  let offset = 0;
  let cmap: { offset: number; length: number } | undefined;
  for (let i = 0; i < tables; i++) {
    const flags = file[at++];
    const tag = flags & 0x3f;
    const version = flags >> 6;
    if (tag === OTHER_TAG) at += 4;
    let length: number;
    ({ value: length, next: at } = readBase128(file, at));
    const transformed = tag === GLYF || tag === LOCA ? version !== 3 : tag === HMTX ? version === 1 : false;
    if (transformed) ({ value: length, next: at } = readBase128(file, at));
    if (tag === CMAP) cmap = { offset, length };
    offset += length;
  }
  if (!cmap) throw new Error('The font file has no character map (cmap).');

  // Then every table, one after another, as one Brotli stream.
  const data = brotliDecompressSync(file.subarray(at, at + compressed));
  return data.subarray(cmap.offset, cmap.offset + cmap.length);
}

/**
 * Every character a WOFF2 font file has a glyph for, as code points, from its
 * character map. Only the Unicode subtables are read (formats 4 and 12, which
 * every web font uses).
 */
export function woff2Codepoints(file: Uint8Array): Set<number> {
  const cmap = cmapTable(file);
  const view = new DataView(cmap.buffer, cmap.byteOffset, cmap.byteLength);
  const held = new Set<number>();
  const subtables = view.getUint16(2);
  for (let i = 0; i < subtables; i++) {
    const platform = view.getUint16(4 + i * 8);
    const encoding = view.getUint16(6 + i * 8);
    const start = view.getUint32(8 + i * 8);
    // Unicode, or Windows with a Unicode encoding.
    if (!(platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10)))) continue;
    const format = view.getUint16(start);
    if (format === 4) {
      const segments = view.getUint16(start + 6) / 2;
      const ends = start + 14;
      const starts = ends + segments * 2 + 2;
      const deltas = starts + segments * 2;
      const rangeOffsets = deltas + segments * 2;
      for (let s = 0; s < segments; s++) {
        const first = view.getUint16(starts + s * 2);
        const last = view.getUint16(ends + s * 2);
        const delta = view.getUint16(deltas + s * 2);
        const rangeOffset = view.getUint16(rangeOffsets + s * 2);
        for (let code = first; code <= last && code !== 0xffff; code++) {
          let glyph: number;
          if (rangeOffset === 0) glyph = (code + delta) & 0xffff;
          else {
            glyph = view.getUint16(rangeOffsets + s * 2 + rangeOffset + (code - first) * 2);
            if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
          }
          if (glyph !== 0) held.add(code);
        }
      }
    } else if (format === 12) {
      const groups = view.getUint32(start + 12);
      for (let g = 0; g < groups; g++) {
        const first = view.getUint32(start + 16 + g * 12);
        const last = view.getUint32(start + 20 + g * 12);
        const glyph = view.getUint32(start + 24 + g * 12);
        for (let code = first; code <= last; code++) if (glyph + (code - first) !== 0) held.add(code);
      }
    }
  }
  if (held.size === 0) throw new Error("The font file's character map has no Unicode table this can read.");
  return held;
}

// --- The faces a built page declares -----------------------------------------

/** Which of the site's two families: Fraunces (`display`) or IBM Plex Sans (`text`). */
export type Family = 'display' | 'text';

/** A face as CSS asks for it, such as `text 500 normal`. */
export type FaceName = `${Family} ${string} ${'normal' | 'italic'}`;

/** One @font-face a page declares with a file of its own. */
export interface ServedFace {
  face: FaceName;
  /** The file's address on the site, such as /_astro/fonts/abc.woff2. */
  url: string;
  /** Its `unicode-range`, as [first, last] pairs; empty when the face declares none. */
  ranges: [number, number][];
}

/**
 * The faces a built page declares. `variables` names the CSS variable Astro's
 * fonts API gives each family (astro.config.mjs's `cssVariable`): the first
 * family in that variable's value is the one whose @font-face rules count.
 */
export function servedFaces(html: string, variables: Record<Family, string>): ServedFace[] {
  const unquote = (name: string) => name.trim().replace(/^(["'])(.*)\1$/, '$2');
  const families = new Map<string, Family>();
  for (const family of ['display', 'text'] as const) {
    const value = new RegExp(`${variables[family]}\\s*:\\s*([^;}]+)`).exec(html)?.[1];
    if (!value) throw new Error(`The page sets no ${variables[family]}, so its ${family} font can't be found.`);
    families.set(unquote(/^("[^"]*"|'[^']*'|[^,]+)/.exec(value.trim())![0]), family);
  }
  const faces: ServedFace[] = [];
  for (const [, rule] of html.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const property = (name: string) => new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`).exec(rule)?.[1].trim();
    const family = families.get(unquote(property('font-family') ?? ''));
    const url = /url\(\s*["']?([^"')]+)["']?\s*\)/.exec(property('src') ?? '')?.[1];
    if (!family || !url) continue; // another family, or a fallback face made from a local font
    const ranges = [...(property('unicode-range') ?? '').matchAll(/U\+([0-9a-f]+)(?:-([0-9a-f]+))?/gi)].map(
      ([, first, last]): [number, number] => [parseInt(first, 16), parseInt(last ?? first, 16)],
    );
    const style = property('font-style') === 'italic' ? 'italic' : 'normal';
    faces.push({ face: `${family} ${property('font-weight') ?? '400'} ${style}`, url, ranges });
  }
  return faces;
}

// --- Every character a built page draws ---------------------------------------

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
// Text in these is never drawn in the page's fonts.
const UNDRAWN = new Set(['script', 'style', 'template', 'title', 'desc']);
const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

const decode = (text: string) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name[0] !== '#') return ENTITIES[name.toLowerCase()] ?? whole;
    return String.fromCodePoint(name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10));
  });

interface Open {
  tag: string;
  classes: string[];
  /** A list that draws markers, and how many items it has opened so far. */
  markers?: { ordered: boolean; count: number };
}

/** The face that draws text inside these open elements, innermost last. */
function faceOf(open: Open[]): FaceName {
  let family: Family = 'text';
  for (let i = open.length - 1; i >= 0; i--) {
    const { tag, classes } = open[i];
    if (classes.includes('group-name')) break; // set back to Plex
    if (tag === 'h1' || tag === 'h2' || tag === 'h3' || classes.includes('display')) {
      family = 'display';
      break;
    }
  }
  const medium = family === 'text' && open.some(({ classes }) => classes.includes('name'));
  const italic = open.some(({ tag }) => tag === 'em');
  return `${family} ${medium ? '500' : '400'} ${italic ? 'italic' : 'normal'}`;
}

/**
 * Every character a built page's <body> draws, by face: each face's code
 * points, each with the element it was first seen in. Text counts whether or
 * not it is showing, since a label that shows later is drawn in the same
 * face. Line breaks and tabs between elements draw nothing and are left out.
 */
export function drawnCharacters(html: string): Map<FaceName, Map<number, string>> {
  const drawn = new Map<FaceName, Map<number, string>>();
  const add = (face: FaceName, text: string, where: string) => {
    let seen = drawn.get(face);
    if (!seen) drawn.set(face, (seen = new Map()));
    for (const char of text) {
      const code = char.codePointAt(0)!;
      if (code === 0x0a || code === 0x0d || code === 0x09) continue;
      if (!seen.has(code)) seen.set(code, where);
    }
  };
  const label = ({ tag, classes }: Open) => `<${[tag, ...classes].join('.')}>`;

  const body = /<body\b[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1];
  if (body === undefined) throw new Error('The page has no <body>.');
  const open: Open[] = [];
  const token = /<!--[\s\S]*?-->|<(script|style|template)\b[\s\S]*?<\/\1\s*>|<(\/?)([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|([^<]+)/g;
  for (const [, , closing, name, attributes, text] of body.matchAll(token)) {
    if (text !== undefined) {
      if (open.some(({ tag }) => UNDRAWN.has(tag))) continue;
      add(faceOf(open), decode(text), open.length ? label(open[open.length - 1]) : '<body>');
      continue;
    }
    if (name === undefined) continue; // a comment, a script, or a style
    const tag = name.toLowerCase();
    if (closing) {
      const at = open.findLastIndex((element) => element.tag === tag);
      if (at >= 0) open.length = at;
      continue;
    }
    const attribute = (wanted: string) => new RegExp(`\\s${wanted}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, 'i').exec(attributes)?.slice(1).find((v) => v !== undefined);
    const element: Open = { tag, classes: (attribute('class') ?? '').split(/\s+/).filter(Boolean) };
    // global.css takes the markers off a list marked role="list"; any other list draws them.
    if ((tag === 'ul' || tag === 'ol') && attribute('role') !== 'list') element.markers = { ordered: tag === 'ol', count: 0 };
    if (tag === 'li') {
      const list = open.findLast((parent) => parent.tag === 'ul' || parent.tag === 'ol');
      // A bullet, or the item's number and a full stop; then a space, either way.
      if (list?.markers) add(faceOf([...open, element]), list.markers.ordered ? `${++list.markers.count}. ` : '• ', `${label(element)}'s marker`);
    }
    if (!VOID.has(tag) && !/\/\s*$/.test(attributes)) open.push(element);
  }
  return drawn;
}

// --- The check -----------------------------------------------------------------

const hex = (code: number) => `U+${code.toString(16).toUpperCase().padStart(4, '0')}`;

/**
 * What's wrong, one line per character: a character a page draws in a face
 * whose file doesn't hold it, or that the face's `unicode-range` leaves out,
 * or a face the page uses and never declares. An empty list means every drawn
 * character is covered.
 *
 * `pages` are built pages by path; `readFont` returns a font file's bytes
 * from the address its @font-face gives.
 */
export function uncoveredCharacters(
  pages: { path: string; html: string }[],
  readFont: (url: string) => Uint8Array,
  variables: Record<Family, string>,
): string[] {
  const files = new Map<string, Set<number>>();
  const problems: string[] = [];
  for (const { path, html } of pages) {
    const faces = servedFaces(html, variables);
    for (const [face, characters] of drawnCharacters(html)) {
      const served = faces.find((candidate) => candidate.face === face);
      if (!served) {
        problems.push(`${path} draws text in "${face}", and the page declares no such font face.`);
        continue;
      }
      let held = files.get(served.url);
      if (!held) files.set(served.url, (held = woff2Codepoints(readFont(served.url))));
      for (const [code, where] of characters) {
        const what = `${hex(code)} ${JSON.stringify(String.fromCodePoint(code))} in ${where} on ${path}`;
        if (!held.has(code)) problems.push(`${what}: "${face}" draws it, and ${served.url} has no glyph for it.`);
        else if (served.ranges.length && !served.ranges.some(([first, last]) => code >= first && code <= last)) {
          problems.push(`${what}: "${face}" draws it, and that face's unicode-range leaves it out, so ${served.url} is never used for it.`);
        }
      }
    }
  }
  return problems;
}
