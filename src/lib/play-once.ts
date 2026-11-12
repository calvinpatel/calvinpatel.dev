// Playing a section drawing once (DESIGN.md, Motion: Rules for every piece,
// rules 1, 2, and 4). Every drawing below the hero shares these rules:
//
//   - It plays once, the first time it is in view by its own rule: fully in
//     view, unless the drawing supplies another. Then it stays at rest.
//   - Fully off screen mid-play, or in a hidden tab, it holds where it is and
//     resumes when it's back.
//   - A change of its size mid-play, which a change of width or text size
//     causes, sends it straight to rest, and it counts as played.
//   - With reduced motion on it never plays, and coming into view counts as
//     played. Switching reduced motion on mid-play sends it straight to rest.
//
// The rules are in createTrigger, which has no DOM, so Node can run
// tests/play-once.test.ts against it directly, and against animated with
// stand-ins for its animations. playOnce and fullyInView watch the page and
// are browser only.

/** Where a drawing is: waiting to play, playing, held mid-play, or done. */
export type Phase = 'waiting' | 'playing' | 'held' | 'played';

/** What a drawing is told to do. */
export type Order = 'play' | 'hold' | 'resume' | 'rest';

export interface Surroundings {
  inView: boolean; // by the drawing's rule for starting
  onScreen: boolean; // any part of the drawing
  tabVisible: boolean;
  reducedMotion: boolean;
}

export interface Trigger {
  phase(): Phase;
  /** Something around the drawing changed. Returns what the drawing must do now, if anything. */
  update(change: Partial<Surroundings>): Order | null;
  /** The drawing's size changed. */
  resized(): Order | null;
  /** The drawing has finished playing. */
  finished(): void;
}

/** One drawing's trigger. It does nothing until it is told something. */
export function createTrigger(surroundings: Surroundings): Trigger {
  const now = { ...surroundings };
  let phase: Phase = 'waiting';
  const rest = (): Order => {
    phase = 'played';
    return 'rest';
  };
  return {
    phase: () => phase,
    update(change) {
      Object.assign(now, change);
      const seen = now.onScreen && now.tabVisible;
      if (phase === 'waiting') {
        if (!now.inView || !seen) return null;
        // Shown at rest, which is all it does with reduced motion on.
        if (now.reducedMotion) {
          phase = 'played';
          return null;
        }
        phase = 'playing';
        return 'play';
      }
      if (phase === 'playing') {
        if (now.reducedMotion) return rest();
        if (seen) return null;
        phase = 'held';
        return 'hold';
      }
      if (phase === 'held') {
        if (now.reducedMotion) return rest();
        if (!seen) return null;
        phase = 'playing';
        return 'resume';
      }
      return null;
    },
    resized() {
      return phase === 'playing' || phase === 'held' ? rest() : null;
    },
    finished() {
      if (phase === 'playing') phase = 'played';
    },
  };
}

/** A drawing's motion, as the trigger drives it. */
export interface Drawing {
  /** Start from rest. Call `finished` once everything is back at rest. */
  play(finished: () => void): void;
  /** Stop where it is. */
  hold(): void;
  /** Carry on from where it was held. */
  resume(): void;
  /** Go straight to rest. */
  rest(): void;
}

/** What `animated` needs of a Web Animation, so a test can stand one in. */
export interface Playable {
  readonly playState: string;
  readonly finished: Promise<unknown>;
  pause(): void;
  play(): void;
  cancel(): void;
}

/**
 * A drawing made of Web Animations. `start` starts them and returns them.
 * None should fill forwards, so each leaves its part at rest when it ends.
 */
export function animated(start: () => Playable[]): Drawing {
  let all: Playable[] = [];
  return {
    play(finished) {
      all = start();
      // Rest cancels them, which rejects these promises. That isn't an error,
      // and the trigger already knows.
      Promise.all(all.map((animation) => animation.finished)).then(finished, () => {});
    },
    // Only the ones still running: pausing one that has ended and playing it
    // again would start it over.
    hold() {
      for (const animation of all) if (animation.playState === 'running') animation.pause();
    },
    resume() {
      for (const animation of all) if (animation.playState === 'paused') animation.play();
    },
    rest() {
      for (const animation of all.splice(0)) animation.cancel();
    },
  };
}

/**
 * A drawing's own rule for when it is in view. It watches `element`, calls
 * `tell` whenever the answer changes, and returns what stops the watching.
 */
export type Watch = (element: Element, tell: (inView: boolean) => void) => () => void;

// Fully in view means within this many px of it. A box on a fractional pixel
// can measure just short of fully visible when it is, and would never play.
const SLACK = 1;

function watchScreen(element: Element, tell: (onScreen: boolean, fully: boolean) => void): () => void {
  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[entries.length - 1];
      tell(entry.isIntersecting, entry.intersectionRatio >= 1);
    },
    { rootMargin: `${SLACK}px`, threshold: [0, 1] },
  );
  observer.observe(element);
  return () => observer.disconnect();
}

/** The rule unless a drawing supplies its own: all of `element` is on screen. */
export const fullyInView: Watch = (element, tell) => watchScreen(element, (_, fully) => tell(fully));

/**
 * Plays `drawing` once, by the rules above. `element` is the drawing's box:
 * what must be on screen, and whose size is watched. Browser only.
 */
export function playOnce(element: Element, drawing: Drawing, options: { inView?: Watch } = {}): void {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const trigger = createTrigger({
    inView: false,
    onScreen: false,
    tabVisible: !document.hidden,
    reducedMotion: reduced.matches,
  });

  // Once it has played, nothing watches it any more.
  const stops: (() => void)[] = [];
  const tidy = () => {
    if (trigger.phase() === 'played') for (const stop of stops.splice(0)) stop();
  };
  const obey = (order: Order | null) => {
    if (order === 'play') {
      drawing.play(() => {
        trigger.finished();
        tidy();
      });
    } else if (order) {
      drawing[order]();
    }
    tidy();
  };

  const { inView } = options;
  stops.push(
    watchScreen(element, (onScreen, fully) => obey(trigger.update(inView ? { onScreen } : { onScreen, inView: fully }))),
  );
  if (inView) stops.push(inView(element, (yes) => obey(trigger.update({ inView: yes }))));

  const tab = () => obey(trigger.update({ tabVisible: !document.hidden }));
  document.addEventListener('visibilitychange', tab);
  stops.push(() => document.removeEventListener('visibilitychange', tab));

  const motion = () => obey(trigger.update({ reducedMotion: reduced.matches }));
  reduced.addEventListener('change', motion);
  stops.push(() => reduced.removeEventListener('change', motion));

  // The observer's first report is the size the drawing starts with.
  let size: string | undefined;
  const sizes = new ResizeObserver(([entry]) => {
    const measured = `${entry.contentRect.width} ${entry.contentRect.height}`;
    if (size !== undefined && measured !== size) obey(trigger.resized());
    size = measured;
  });
  sizes.observe(element);
  stops.push(() => sizes.disconnect());

  tidy();
}
