// Reads tokens.css from a script. A drawing's script needs a token's number,
// such as a spacing or a dot's size, to work out where things go; everything
// else stays in CSS (CLAUDE.md rule 6). Browser only.

/**
 * A reader for the tokens' numbers: `token('--raster-pitch')` gives 4 for
 * `4px`. It reads a token as written, so it suits plain numbers and px
 * lengths, not a rem length or a calc().
 */
export function tokenReader(): (name: string) => number {
  const tokens = getComputedStyle(document.documentElement);
  return (name) => parseFloat(tokens.getPropertyValue(name));
}
