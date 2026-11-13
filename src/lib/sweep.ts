// The Experience raster's sweep (DESIGN.md, Motion: Experience raster): a
// playback cursor crosses one row, and each spike flashes as the cursor
// reaches it.
//
//   - The cursor's center travels from the row's left end to its right end
//     over --sweep, at a steady rate. It fades in over --flash-in as it starts
//     moving, and out over --flash-in once it has arrived, where it stays
//     while it fades.
//   - A spike's flash starts the moment the cursor's center reaches the
//     spike's center.
//   - The cursor moves with its x and fades with fill-opacity, both painted
//     properties (DESIGN.md, Motion: Brain cells and nuclei), so the cursor
//     and the flashes are drawn in the same frames.
//
// Raster.astro's script starts what these return. No DOM and no Astro
// imports, so Node can run tests/sweep.test.ts against it directly.

export interface SweepTokens {
  sweep: number; // --sweep, ms
  fade: number; // --flash-in, ms
  strength: number; // --sweep-cursor
  rate: string; // --ease-travel
  ease: string; // --ease-out
}

/** One of the cursor's animations, as `element.animate(keyframes, timing)` takes it. */
export interface Motion {
  keyframes: Keyframe[];
  timing: KeyframeAnimationOptions;
}

/**
 * When the cursor's center reaches each spike's, in ms from the sweep's start.
 * `spikes` are in px from the row's left end, on a row `width` px wide.
 */
export function arrivals(spikes: number[], width: number, sweep: number): number[] {
  return spikes.map((spike) => (spike / width) * sweep);
}

/**
 * The cursor's travel and its fades on a row `width` px wide. Both last the
 * sweep and the fade out after it. Neither fills, so the cursor is at its
 * stylesheet's rest, which shows nothing, before them and after.
 */
export function cursor(tokens: SweepTokens, width: number): { travel: Motion; fade: Motion } {
  const duration = tokens.sweep + tokens.fade;
  const arrived = tokens.sweep / duration;
  const end = `${width}px`;
  return {
    travel: {
      keyframes: [{ x: '0px', easing: tokens.rate }, { x: end, offset: arrived }, { x: end }],
      timing: { duration },
    },
    fade: {
      keyframes: [
        { fillOpacity: 0, easing: tokens.ease },
        { fillOpacity: tokens.strength, offset: tokens.fade / duration },
        { fillOpacity: tokens.strength, offset: arrived, easing: tokens.ease },
        { fillOpacity: 0 },
      ],
      timing: { duration },
    },
  };
}
