// Tests for the build's font check. Run from the repo root:
//   node --test tests/font-coverage.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { brotliCompressSync } from 'node:zlib';

import { drawnCharacters, servedFaces, uncoveredCharacters, woff2Codepoints } from '../src/lib/font-coverage.ts';

// --- Font files made for the tests: only what the reader looks at. -----------

const u16 = (...values: number[]) => values.flatMap((v) => [(v >> 8) & 0xff, v & 0xff]);
const u32 = (...values: number[]) => values.flatMap((v) => [(v >>> 24) & 0xff, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff]);
/** A length the way WOFF2 writes it: 7 bits a byte, the high bit set on all but the last. */
const base128 = (value: number) => (value < 128 ? [value] : [0x80 | (value >> 7), value & 0x7f]);

/** A format 4 subtable. A segment maps start..end by a delta, or through a list of glyphs (0 = no glyph). */
function format4(segments: { start: number; end: number; delta?: number; glyphs?: number[] }[]): number[] {
  const all = [...segments, { start: 0xffff, end: 0xffff, delta: 1 }];
  const count = all.length;
  const glyphArray: number[] = [];
  const rangeOffsets = all.map((segment, i) => {
    if (!segment.glyphs) return 0;
    // From this segment's own slot to its glyphs, in bytes.
    const offset = (count - i) * 2 + glyphArray.length * 2;
    glyphArray.push(...segment.glyphs);
    return offset;
  });
  const body = [
    ...u16(count * 2, 0, 0, 0),
    ...u16(...all.map((s) => s.end)),
    ...u16(0),
    ...u16(...all.map((s) => s.start)),
    ...u16(...all.map((s) => (s.delta ?? 0) & 0xffff)),
    ...u16(...rangeOffsets),
    ...u16(...glyphArray),
  ];
  return [...u16(4, body.length + 6, 0), ...body];
}

/** A format 12 subtable: groups of [first, last, first glyph]. */
const format12 = (groups: [number, number, number][]) => [...u16(12, 0), ...u32(16 + groups.length * 12, 0, groups.length), ...groups.flatMap((g) => u32(...g))];

/** A cmap table holding the given subtables. */
function cmap(subtables: { platform: number; encoding: number; data: number[] }[]): number[] {
  let offset = 4 + subtables.length * 8;
  const records = subtables.flatMap(({ platform, encoding, data }) => {
    const record = [...u16(platform, encoding), ...u32(offset)];
    offset += data.length;
    return record;
  });
  return [...u16(0, subtables.length), ...records, ...subtables.flatMap((s) => s.data)];
}

/**
 * A WOFF2 file holding the given tables in order. `tag` is a table's place
 * in WOFF2's list of names (0 is cmap, 10 glyf) or a four-letter name;
 * `stored` is how many bytes a transformed table takes up.
 */
function woff2(tables: { tag: number | string; data: number[]; version?: number; stored?: number }[]): Uint8Array {
  const directory = tables.flatMap(({ tag, data, version = 0, stored }) => [
    (version << 6) | (typeof tag === 'number' ? tag : 63),
    ...(typeof tag === 'string' ? [...tag].map((c) => c.charCodeAt(0)) : []),
    ...base128(stored === undefined ? data.length : 9999), // a transformed table's first length is its original one
    ...(stored === undefined ? [] : base128(stored)),
  ]);
  const compressed = brotliCompressSync(Uint8Array.from(tables.flatMap((t) => t.data)));
  const header = [...u32(0x774f4632, 0x00010000, 0), ...u16(tables.length, 0), ...u32(0, compressed.length), ...u16(1, 0), ...u32(0, 0, 0, 0, 0)];
  return Uint8Array.from([...header, ...directory, ...compressed]);
}

/** A font file that holds exactly these characters. */
const fontOf = (characters: string) =>
  woff2([{ tag: 0, data: cmap([{ platform: 3, encoding: 10, data: format12([...characters].map((c, i) => [c.codePointAt(0)!, c.codePointAt(0)!, i + 1])) }]) }]);

const codes = (text: string) => [...text].map((c) => c.codePointAt(0)!);

// --- The characters a .woff2 file holds ---------------------------------------

test('a character map in format 4 gives the characters its segments cover', () => {
  const file = woff2([{ tag: 0, data: cmap([{ platform: 3, encoding: 1, data: format4([{ start: 0x41, end: 0x43, delta: -0x40 }, { start: 0x2191, end: 0x2191, delta: 10 }]) }]) }]);
  assert.deepEqual([...woff2Codepoints(file)], [0x41, 0x42, 0x43, 0x2191]);
});

test('a format 4 segment that lists its glyphs leaves out the ones with none', () => {
  // a, b, c, d: b has glyph 0, which is no glyph.
  const file = woff2([{ tag: 0, data: cmap([{ platform: 0, encoding: 3, data: format4([{ start: 0x61, end: 0x64, glyphs: [5, 0, 7, 8] }]) }]) }]);
  assert.deepEqual([...woff2Codepoints(file)], codes('acd'));
});

test('a character map in format 12 gives every character in its groups', () => {
  const file = woff2([{ tag: 0, data: cmap([{ platform: 3, encoding: 10, data: format12([[0x20, 0x22, 1], [0x1f9e0, 0x1f9e0, 9]]) }]) }]);
  assert.deepEqual([...woff2Codepoints(file)], [0x20, 0x21, 0x22, 0x1f9e0]);
});

test("the character map is found wherever it sits among the file's tables", () => {
  const file = woff2([
    { tag: 6, data: [1, 2, 3, 4, 5] }, // OS/2
    { tag: 10, data: [9, 9, 9], stored: 3 }, // glyf, transformed: two lengths
    { tag: 'ABCD', data: [7, 7] }, // a table with its name written out
    { tag: 0, data: cmap([{ platform: 3, encoding: 1, data: format4([{ start: 0x2192, end: 0x2192, delta: 3 }]) }]) },
    { tag: 3, data: [0, 0] }, // hmtx, not transformed
  ]);
  assert.deepEqual([...woff2Codepoints(file)], [0x2192]);
});

test('a subtable for another platform is passed over', () => {
  const file = woff2([
    {
      tag: 0,
      data: cmap([
        { platform: 1, encoding: 0, data: format4([{ start: 0x30, end: 0x39, delta: 1 }]) }, // Macintosh
        { platform: 3, encoding: 1, data: format4([{ start: 0x41, end: 0x41, delta: 1 }]) },
      ]),
    },
  ]);
  assert.deepEqual([...woff2Codepoints(file)], [0x41]);
});

test("a file that isn't a WOFF2 font, or has no character map, is an error", () => {
  assert.throws(() => woff2Codepoints(new Uint8Array(64)), /isn't a WOFF2/);
  assert.throws(() => woff2Codepoints(new TextEncoder().encode('wOFF')), /isn't a WOFF2/);
  assert.throws(() => woff2Codepoints(woff2([{ tag: 6, data: [1, 2, 3] }])), /no character map/);
  assert.throws(() => woff2Codepoints(woff2([{ tag: 0, data: cmap([{ platform: 1, encoding: 0, data: format4([]) }]) }])), /no Unicode table/);
});

// --- The faces a built page declares -------------------------------------------

const VARIABLES = { display: '--font-fraunces', text: '--font-plex' } as const;
const RANGE = 'unicode-range:U+0000-00FF,U+2000-206F,U+2191,U+2193;';
const RANGES = [[0, 0xff], [0x2000, 0x206f], [0x2191, 0x2191], [0x2193, 0x2193]];
const STYLE = `<style>
@font-face{font-family:Fraunces-ab12;src:url("/_astro/fonts/fr.woff2") format("woff2");font-display:swap;${RANGE}font-weight:400;font-style:normal;}
@font-face{font-family:"Fraunces-ab12 fallback: Times New Roman";src:local("Times New Roman");font-weight:400;font-style:normal;size-adjust:116%;}
@font-face{font-family:"IBM Plex Sans-cd34";src:url("/_astro/fonts/p400.woff2") format("woff2");${RANGE}font-weight:400;font-style:normal;}
@font-face{font-family:"IBM Plex Sans-cd34";src:url("/_astro/fonts/p500.woff2") format("woff2");font-weight:500;font-style:normal;}
@font-face{font-family:"IBM Plex Sans-cd34";src:url("/_astro/fonts/p400i.woff2") format("woff2");${RANGE}font-weight:400;font-style:italic;}
@font-face{font-family:"IBM Plex Sans-cd34 fallback: Arial";src:local("Arial");font-weight:400;font-style:normal;}
:root{--font-fraunces:Fraunces-ab12,"Fraunces-ab12 fallback: Times New Roman",Georgia,serif;--font-plex:"IBM Plex Sans-cd34","IBM Plex Sans-cd34 fallback: Arial",system-ui,sans-serif;}
</style>`;
const page = (body: string) => `<!doctype html><html lang="en"><head><title>A title → here</title>${STYLE}</head><body>${body}</body></html>`;

test("a page's faces are the ones with a file, named by the two families' variables", () => {
  assert.deepEqual(servedFaces(page(''), VARIABLES), [
    { face: 'display 400 normal', url: '/_astro/fonts/fr.woff2', ranges: RANGES },
    { face: 'text 400 normal', url: '/_astro/fonts/p400.woff2', ranges: RANGES },
    { face: 'text 500 normal', url: '/_astro/fonts/p500.woff2', ranges: [] },
    { face: 'text 400 italic', url: '/_astro/fonts/p400i.woff2', ranges: RANGES },
  ]);
});

test("a page that doesn't set a family's variable is an error", () => {
  assert.throws(() => servedFaces('<html><body></body></html>', VARIABLES), /sets no --font-fraunces/);
});

// --- Every character a built page draws -----------------------------------------

const drawnText = (body: string) => Object.fromEntries([...drawnCharacters(page(body))].map(([face, seen]) => [face, String.fromCodePoint(...seen.keys())]));

test('headings and .display are Fraunces, and everything else is Plex', () => {
  assert.deepEqual(drawnText('<h1>Ab</h1><p>cd</p><h2>E<span>f</span></h2><h3>G</h3><p class="lede display">H</p><a class="mark display">I<span class="visually-hidden">j</span></a>'), {
    'display 400 normal': 'AbEfGHIj',
    'text 400 normal': 'cd',
  });
});

test('a heading set back to Plex, italics, and a brain label name each get their own face', () => {
  assert.deepEqual(drawnText('<h3 class="group-name">Ab</h3><p>c<em>de</em></p><div class="label"><span class="name">Fg</span><span class="line">hi</span></div>'), {
    'text 400 normal': 'Abchi',
    'text 400 italic': 'de',
    'text 500 normal': 'Fg',
  });
});

test('a list with markers draws a bullet, or each number and its stop, in Plex', () => {
  assert.deepEqual(drawnText('<ul class="list"><li>a</li><li>b</li></ul>'), { 'text 400 normal': '• ab' });
  assert.deepEqual(drawnText('<ol><li>a</li><li>b</li></ol>'), { 'text 400 normal': '1. a2b' });
  assert.deepEqual(drawnText('<ul role="list"><li>a</li></ul><ol role="list"><li>b</li></ol>'), { 'text 400 normal': 'ab' });
});

test('a list inside a list keeps its own markers and its own count', () => {
  assert.deepEqual(drawnText('<ol><li>a<ul role="list"><li>b</li></ul></li><li>c</li></ol>'), { 'text 400 normal': '1. ab2c' });
});

test('what is never drawn in the page fonts is left out', () => {
  const body = '<!-- a → comment --><script>const arrow = "→";</script><style>p::after{content:"→"}</style><svg><title>→</title><desc>→</desc><path d="M0 0"/><text>T</text></svg><img alt="→"><p>x</p>';
  assert.deepEqual(drawnText(body), { 'text 400 normal': 'Tx' });
});

test('character references are read as the characters they stand for', () => {
  assert.deepEqual(drawnText('<p>R&amp;D &#8594; &#x2192;&nbsp;&lt;</p>'), { 'text 400 normal': 'R&D → <' });
});

test('text that is not showing counts, and line breaks between elements do not', () => {
  assert.deepEqual(drawnText('<p hidden>a</p>\n\t<p class="visually-hidden">b</p>\n'), { 'text 400 normal': 'ab' });
});

test('each character is reported with the element it was first seen in', () => {
  const seen = drawnCharacters(page('<main><p class="intro wide">a →</p><h2>→</h2></main>'));
  assert.equal(seen.get('text 400 normal')!.get(0x2192), '<p.intro.wide>');
  assert.equal(seen.get('display 400 normal')!.get(0x2192), '<h2>');
});

// --- The check -------------------------------------------------------------------

const FONTS: Record<string, Uint8Array> = {
  '/_astro/fonts/fr.woff2': fontOf('ABCabc '),
  '/_astro/fonts/p400.woff2': fontOf('ABCabc •↑↓€'),
  '/_astro/fonts/p500.woff2': fontOf('ABCabc '),
  '/_astro/fonts/p400i.woff2': fontOf('ABCabc '),
};
const readFont = (url: string) => FONTS[url];
const check = (body: string) => uncoveredCharacters([{ path: '/index.html', html: page(body) }], readFont, VARIABLES);

test('a page whose every character is in its face has nothing wrong', () => {
  assert.deepEqual(check('<h1>Abc</h1><p>a <em>b</em> ↑</p><ul><li>c</li></ul><span class="name">B</span>'), []);
});

test('an arrow the file lacks is named, with its face, its place, and its file', () => {
  assert.deepEqual(check('<p class="links">a →</p>'), [
    'U+2192 "→" in <p.links> on /index.html: "text 400 normal" draws it, and /_astro/fonts/p400.woff2 has no glyph for it.',
  ]);
});

test("each face is checked against its own file: Fraunces's has no arrows", () => {
  assert.deepEqual(check('<p>↑</p><h2>a ↑</h2>'), ['U+2191 "↑" in <h2> on /index.html: "display 400 normal" draws it, and /_astro/fonts/fr.woff2 has no glyph for it.']);
});

test("a character the file holds but the face's unicode-range leaves out is caught too", () => {
  // The euro sign is in the file, and outside the face's ranges.
  assert.deepEqual(check('<p>a €</p>'), [
    'U+20AC "€" in <p> on /index.html: "text 400 normal" draws it, and that face\'s unicode-range leaves it out, so /_astro/fonts/p400.woff2 is never used for it.',
  ]);
});

test('text in a face the page never declares is named', () => {
  assert.deepEqual(check('<h1><em>a</em></h1>'), ['/index.html draws text in "display 400 italic", and the page declares no such font face.']);
});

test('every page is checked, and each is named', () => {
  const pages = [
    { path: '/index.html', html: page('<p>a</p>') },
    { path: '/credits.html', html: page('<p>→</p>') },
  ];
  assert.deepEqual(uncoveredCharacters(pages, readFont, VARIABLES).map((line) => / on (\S+):/.exec(line)![1]), ['/credits.html']);
});
