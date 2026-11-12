// The flash (DESIGN.md, Motion: The language): a part rises from --ink-rest
// to full over --flash-in and falls back over --flash-out, at a steady rate,
// so that flashes one --hop apart read as one signal travelling. An axon
// node, a raster spike, and a Contact node all flash this way, so it is
// defined here once.
//
// It changes fill-opacity, a painted property, not opacity (DESIGN.md,
// Motion: Brain cells and nuclei), so a part that flashes rests with
// fill-opacity: var(--ink-rest).
//
// flash has no DOM, so Node can run tests/flash.test.ts against it directly.
// flasher reads the tokens and is browser only.

import { tokenReader } from './tokens.ts';

export interface FlashTokens {
  rest: number; // --ink-rest
  rise: number; // --flash-in, ms
  fall: number; // --flash-out, ms
  hop: number; // --hop, ms
  rate: string; // --ease-travel
}

export interface Flash {
  keyframes: Keyframe[];
  timing: KeyframeAnimationOptions;
}

/**
 * One flash, as `element.animate(keyframes, timing)` takes it, starting
 * `hops` × --hop from now. It doesn't fill, so the part is at its stylesheet's
 * rest before the flash and after it.
 */
export function flash(tokens: FlashTokens, hops = 0): Flash {
  const duration = tokens.rise + tokens.fall;
  return {
    keyframes: [
      { fillOpacity: tokens.rest },
      { fillOpacity: 1, offset: tokens.rise / duration },
      { fillOpacity: tokens.rest },
    ],
    timing: { duration, delay: hops * tokens.hop, easing: tokens.rate },
  };
}

/** Reads the flash's tokens, and returns what starts a flash on an element. Browser only. */
export function flasher(): (element: Element, hops?: number) => Animation {
  const token = tokenReader();
  const tokens: FlashTokens = {
    rest: token('--ink-rest'),
    rise: token('--flash-in'),
    fall: token('--flash-out'),
    hop: token('--hop'),
    rate: getComputedStyle(document.documentElement).getPropertyValue('--ease-travel').trim(),
  };
  return (element, hops = 0) => {
    const { keyframes, timing } = flash(tokens, hops);
    return element.animate(keyframes, timing);
  };
}
