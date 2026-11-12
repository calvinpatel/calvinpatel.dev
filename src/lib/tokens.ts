// Reads tokens.css from a script. A drawing's script needs a token's number,
// such as a spacing or a dot's size, to work out where things go; everything
// else stays in CSS (CLAUDE.md rule 6).
//
// The build's minifier rewrites what tokens.css says: 130ms becomes .13s, and
// #000000 becomes #000. tokenNumber and tokenRgb read a value in every form
// the build writes it in, and tests/tokens.test.ts minifies tokens.css the
// way the build does to check that each token still reads the same.
//
// tokenNumber and tokenRgb have no DOM, so Node can run the tests against
// them directly. tokenReader is browser only.

/**
 * A token's number, from its value as the page holds it: 4 for `4px`. A time
 * is always in ms, whichever unit it arrives in, because the build's minifier
 * rewrites tokens.css's `130ms` as `.13s`.
 */
export function tokenNumber(value: string): number {
  const number = parseFloat(value);
  // Seconds, to the nearest thousandth of a ms: .13 × 1000 isn't exactly 130.
  return /[\d.]s$/.test(value.trim()) ? Math.round(number * 1e6) / 1e3 : number;
}

/** A color's red, green, and blue, each 0 to 255. */
export type Rgb = readonly [number, number, number];

/**
 * A color token's channels, from its value as the page holds it: `#44e07c`,
 * or three digits where the build has shortened six, as `#000` for `#000000`.
 * Any other form is an error, not a wrong color.
 */
export function tokenRgb(value: string): Rgb {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim())?.[1];
  if (hex === undefined) throw new Error(`Can't read the color "${value.trim()}": it isn't #rgb or #rrggbb.`);
  // Each digit of the short form stands for the same digit twice.
  const digits = hex.length === 3 ? [...hex].map((digit) => digit + digit) : [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4)];
  const [red, green, blue] = digits.map((pair) => parseInt(pair, 16));
  return [red, green, blue];
}

/**
 * A reader for the tokens' numbers: `token('--raster-pitch')` gives 4 for
 * `4px`, and `token('--hop')` gives 130 for `130ms`. It reads a token as
 * written, so it suits plain numbers, px lengths, and times, not a rem length
 * or a calc().
 */
export function tokenReader(): (name: string) => number {
  const tokens = getComputedStyle(document.documentElement);
  return (name) => tokenNumber(tokens.getPropertyValue(name));
}
