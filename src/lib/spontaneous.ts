// The five-second window (DESIGN.md, Motion: Rules for every piece, rule 3):
// the hero moves on its own only for the first --spontaneous-window after the
// page loads. The brain's cells and nuclei and the neuron layer all ask this
// one clock, so they stop at the same moment.
//
//   - The clock counts only while the tab is visible, so a page opened in a
//     background tab still gets its window when the visitor first sees it.
//   - It closes once and stays closed. Motion the visitor starts doesn't ask it.
//
// The counting is in createCountdown, which has no DOM, so Node can run
// tests/spontaneous.test.ts against it directly. spontaneousWindow() is the
// page's one clock and is browser only.

import { tokenReader } from './tokens.ts';

export interface Countdown {
  /** Start or restart counting, at time `now` in ms. */
  resume(now: number): void;
  /** Stop counting, at time `now`. */
  pause(now: number): void;
  /** The ms left to count, at time `now`. */
  remaining(now: number): number;
}

/** A countdown of `duration` ms that only runs between resume and pause. */
export function createCountdown(duration: number): Countdown {
  let counted = 0;
  let since: number | null = null;
  const elapsed = (now: number) => counted + (since === null ? 0 : Math.max(0, now - since));
  return {
    resume(now) {
      if (since === null) since = now;
    },
    pause(now) {
      counted = elapsed(now);
      since = null;
    },
    remaining(now) {
      return Math.max(0, duration - elapsed(now));
    },
  };
}

export interface SpontaneousWindow {
  /** Whether the page may still move on its own. */
  isOpen(): boolean;
  /** The ms of visible time left in the window. */
  remaining(): number;
  /** Runs `callback` once, when the window closes; at once if it has. */
  whenClosed(callback: () => void): void;
}

let shared: SpontaneousWindow | undefined;

/** The page's one window. It starts counting the first time anything asks for it. */
export function spontaneousWindow(): SpontaneousWindow {
  if (shared) return shared;

  const countdown = createCountdown(tokenReader()('--spontaneous-window'));
  const callbacks: (() => void)[] = [];
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const close = () => {
    closed = true;
    document.removeEventListener('visibilitychange', sync);
    for (const callback of callbacks.splice(0)) callback();
  };
  // Count while the tab is visible, and close when the count runs out.
  function sync() {
    clearTimeout(timer);
    const now = performance.now();
    if (document.hidden) {
      countdown.pause(now);
    } else {
      countdown.resume(now);
      timer = setTimeout(close, countdown.remaining(now));
    }
  }
  document.addEventListener('visibilitychange', sync);
  sync();

  shared = {
    isOpen: () => !closed,
    remaining: () => (closed ? 0 : countdown.remaining(performance.now())),
    whenClosed(callback) {
      if (closed) callback();
      else callbacks.push(callback);
    },
  };
  return shared;
}
