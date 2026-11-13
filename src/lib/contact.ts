// The Contact sequence (DESIGN.md, Motion: Contact sequence): the signal hops
// the synapse's three nodes, the terminal releases three vesicles across the
// gap, the receptor band brightens as the first arrives, and the email's
// underline brightens as it goes.
//
//   - The nodes flash with the shared flash (src/lib/flash.ts), one --hop
//     apart. They aren't here.
//   - Each vesicle runs on its own clock. The first releases at
//     --contact-release, reaches the far side of the gap at --contact-receptor,
//     and is gone by --contact-underline. The second and third run the same
//     way, one and two --hop later.
//   - The band and the underline each brighten once, on the first vesicle's
//     clock: up over --flash-in, and back over --contact-settle.
//   - Everything is painted (DESIGN.md, Motion: Brain cells and nuclei): a
//     vesicle fades with fill-opacity and moves with its cx, not a transform,
//     and the band changes stroke-opacity. Its cx is in the figure's own
//     coordinates, so on the turned figure a vesicle drifts down.
//   - The sequence ends at the email's underline, so it starts when the figure
//     and the email's line are both in view (inView below).
//
// Contact.astro's script starts what these return. No DOM and no Astro
// imports, so Node can run tests/contact.test.ts against it directly.

// The figure's own numbers, which belong to the fixed figure like its
// coordinates (DESIGN.md, Drawings: Synapse). They aren't tokens.
/** How far a released vesicle drifts across the gap, in the figure's units. */
export const DRIFT = 20;
/** A released vesicle's fill-opacity while it shows. */
export const SHOWN = 0.9;

export interface ContactTokens {
  hop: number; // --hop, ms
  release: number; // --contact-release, ms
  receptor: number; // --contact-receptor, ms
  underline: number; // --contact-underline, ms
  rise: number; // --flash-in, ms
  settle: number; // --contact-settle, ms
  ease: string; // --ease-out
  link: string; // --color-link-underline
  text: string; // --color-text
}

/** One of the sequence's animations, as `element.animate(keyframes, timing)` takes it. */
export interface Motion {
  keyframes: Keyframe[];
  timing: KeyframeAnimationOptions;
}

/**
 * The `k`th released vesicle's drift and its fades, where `cx` is its place
 * at rest in the figure's units. Both start as it releases, `k` × --hop after
 * the first, and last until it is gone. Neither fills, so before them and
 * after the vesicle is at its stylesheet's rest, which shows nothing.
 */
export function vesicle(tokens: ContactTokens, cx: number, k: number): { drift: Motion; fade: Motion } {
  const duration = tokens.underline - tokens.release;
  const arrived = (tokens.receptor - tokens.release) / duration;
  const far = `${cx + DRIFT}px`;
  const timing = { duration, delay: tokens.release + k * tokens.hop };
  return {
    drift: {
      keyframes: [{ cx: `${cx}px`, easing: tokens.ease }, { cx: far, offset: arrived }, { cx: far }],
      timing,
    },
    fade: {
      keyframes: [
        { fillOpacity: 0, easing: tokens.ease },
        { fillOpacity: SHOWN, offset: tokens.rise / duration },
        { fillOpacity: SHOWN, offset: arrived, easing: tokens.ease },
        { fillOpacity: 0 },
      ],
      timing,
    },
  };
}

/** A rise from `rest` to `full` over --flash-in and a settle back over --contact-settle, `delay` ms from now. */
function brighten<Value>(tokens: ContactTokens, property: string, rest: Value, full: Value, delay: number): Motion {
  const duration = tokens.rise + tokens.settle;
  return {
    keyframes: [
      { [property]: rest, easing: tokens.ease },
      { [property]: full, offset: tokens.rise / duration, easing: tokens.ease },
      { [property]: rest },
    ],
    timing: { duration, delay },
  };
}

/** The receptor band brightening as the first vesicle arrives. `rest` is its resting stroke-opacity. */
export function band(tokens: ContactTokens, rest: number): Motion {
  return brighten(tokens, 'strokeOpacity', rest, 1, tokens.receptor);
}

/** The email's underline brightening as the first vesicle goes. */
export function underline(tokens: ContactTokens): Motion {
  return brighten(tokens, 'textDecorationColor', tokens.link, tokens.text, tokens.underline);
}

/** A box's top and bottom, in px from the screen's top. */
export interface Span {
  top: number;
  bottom: number;
}

/**
 * Whether the sequence may start, on a screen `screen` px tall. The figure
 * and the email's line must both be fully in view, within `slack` px, as
 * play-once allows a box on a fractional pixel. Where the two together are
 * taller than the screen, the email's line decides: it must be fully in view
 * with any of the figure on screen.
 */
export function inView(figure: Span, line: Span, screen: number, slack: number): boolean {
  const fully = (box: Span) => box.top >= -slack && box.bottom <= screen + slack;
  if (!fully(line)) return false;
  if (fully(figure)) return true;
  // Too short for both, by the same slack at each end.
  const both = Math.max(figure.bottom, line.bottom) - Math.min(figure.top, line.top);
  const showing = figure.bottom > -slack && figure.top < screen + slack;
  return both > screen + 2 * slack && showing;
}
