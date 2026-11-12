// Reads tokens.css from a script. A drawing's script needs a token's number,
// such as a spacing or a dot's size, to work out where things go; everything
// else stays in CSS (CLAUDE.md rule 6).
//
// tokenNumber has no DOM, so Node can run tests/tokens.test.ts against it
// directly. tokenReader is browser only.

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
