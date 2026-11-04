/**
 * Shared motion values for the whole site. Every Motion animation takes its
 * curve, duration, spring and in-view trigger from here, so the site moves as
 * one piece. The curves are mirrored as `--motion-*` CSS variables in
 * globals.css for CSS transitions and keyframes.
 */

/** Cubic-bezier curves. `out` is the house curve: things arrive fast and settle softly. */
export const EASE = {
  /** Arriving, settling, revealing. The default for almost everything. */
  out: [0.22, 1, 0.36, 1],
  /** Moving across the screen: wipes, things travelling from A to B. */
  inOut: [0.65, 0, 0.35, 1],
  /** Leaving: the old page, dismissed panels. */
  in: [0.4, 0, 1, 1],
  /** Counters: races up, then crawls to the final number. */
  expo: [0.16, 1, 0.3, 1],
} as const;

/** The same curves as CSS strings, for the Web Animations API and inline styles. */
export const cssEase = (e: readonly number[]) => `cubic-bezier(${e.join(", ")})`;

/** Duration scale, in seconds. Pick the step by how much of the screen moves. */
export const DUR = {
  /** Exits and quick feedback. */
  instant: 0.25,
  /** Small state changes: a badge, a menu item, a shake. */
  fast: 0.4,
  /** UI changes: tabs, accordions, swaps. Also the default for the whole tree. */
  base: 0.6,
  /** Cards and list items entering the viewport. */
  slow: 0.9,
  /** Headlines and blocks revealed on scroll. */
  reveal: 1.1,
  /** Page-level entrances: big titles, wipes. */
  hero: 1.4,
  /** The hero tees and the 3D tee arriving. */
  grand: 1.6,
} as const;

/** Delay between siblings in a cascade, in seconds. */
export const STAGGER = {
  /** Words of a headline. */
  word: 0.055,
  /** Cards, rows, columns. */
  item: 0.08,
  /** Lines of a big title. */
  line: 0.12,
} as const;

/** Named springs, by what they are for. */
export const SPRING = {
  /** Following the pointer: tilt, depth. Soft, no overshoot. */
  follow: { type: "spring", stiffness: 220, damping: 22 },
  /** Hover and toggles. */
  ui: { type: "spring", stiffness: 280, damping: 24 },
  /** Indicators sliding between tabs, toasts. Quick and firm. */
  snappy: { type: "spring", stiffness: 420, damping: 34 },
  /** Badges popping in. */
  pop: { type: "spring", stiffness: 500, damping: 25 },
  /** Success marks: a little overshoot on purpose. */
  bouncy: { type: "spring", stiffness: 260, damping: 14 },
} as const;

/** When a scroll reveal fires: once, a little after the element enters the screen. */
export const VIEWPORT = { once: true, margin: "-8%" } as const;
