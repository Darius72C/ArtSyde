"use client";

import { cssEase, EASE } from "./motion";

/** Trash can: a body and a lid that hinges on its left end. Also used for the "Retirer" button icon. */
export const BIN_SVG = `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <g class="bin-lid"><path d="M9 13h30"/><path d="M19 13v-3a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3"/></g>
  <path d="M13 17l2 23a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3l2-23"/>
  <path d="M20.5 23.5v12M27.5 23.5v12"/>
</svg>`;

const out = cssEase(EASE.out);
const inOut = cssEase(EASE.inOut);
const bounce = "cubic-bezier(0.34, 1.56, 0.64, 1)";

type Bin = { root: HTMLDivElement; lid: SVGGElement; svg: SVGSVGElement; pending: number; leave?: number };
let bin: Bin | null = null;

/** The round bin at the bottom of the screen; pops up the first time, reused while it is out. */
function getBin(): Bin {
  if (bin) {
    window.clearTimeout(bin.leave);
    return bin;
  }
  const root = document.createElement("div");
  root.setAttribute("aria-hidden", "true");
  Object.assign(root.style, {
    position: "fixed",
    left: "50%",
    bottom: "28px",
    width: "76px",
    height: "76px",
    marginLeft: "-38px",
    borderRadius: "999px",
    display: "grid",
    placeItems: "center",
    background: "var(--surface)",
    color: "var(--ink)",
    boxShadow: "0 18px 50px rgba(0,0,0,0.22), 0 0 0 1px color-mix(in srgb, var(--line) 70%, transparent)",
    zIndex: "100",
    pointerEvents: "none",
  });
  root.innerHTML = BIN_SVG;
  const svg = root.querySelector("svg")!;
  Object.assign(svg.style, { width: "40px", height: "40px", overflow: "visible", transformOrigin: "50% 100%" });
  const lid = svg.querySelector<SVGGElement>(".bin-lid")!;
  Object.assign(lid.style, { transformBox: "fill-box", transformOrigin: "0% 100%" });
  document.body.appendChild(root);
  root.animate(
    [
      { transform: "translateY(70px) scale(0.6)", opacity: 0 },
      { transform: "translateY(0) scale(1.06)", opacity: 1, offset: 0.7 },
      { transform: "translateY(0) scale(1)", opacity: 1 },
    ],
    { duration: 420, easing: out, fill: "forwards" },
  );
  bin = { root, lid, svg, pending: 0 };
  return bin;
}

/** Slides the bin away once nothing is flying into it any more. */
function scheduleLeave(b: Bin) {
  b.leave = window.setTimeout(() => {
    if (b.pending > 0) return;
    if (bin === b) bin = null;
    b.root
      .animate([{ transform: "translateY(0) scale(1)", opacity: 1 }, { transform: "translateY(60px) scale(0.8)", opacity: 0 }], { duration: 320, easing: cssEase(EASE.in), fill: "forwards" })
      .finished.finally(() => b.root.remove());
  }, 420);
}

/**
 * Micro-interaction for "remove from cart": a bin pops up, its lid opens, a copy of the item's
 * picture flies from `source` into it, the lid snaps shut and the bin squashes, then it leaves.
 * Nothing happens for reduced-motion users (the row simply goes).
 */
export function flyToBin(source: Element | null) {
  if (typeof window === "undefined" || !source) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const b = getBin();
  b.pending++;

  // Lid opens.
  b.lid.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(-48deg)" }], { duration: 260, delay: 100, easing: out, fill: "forwards" });

  // A copy of the item's picture flies in an arc into the bin's mouth.
  const from = source.getBoundingClientRect();
  const to = b.root.getBoundingClientRect();
  const size = Math.min(from.width, from.height, 160);
  const ghost = document.createElement("div");
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${from.left + from.width / 2 - size / 2}px`,
    top: `${from.top + from.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    zIndex: "101",
    pointerEvents: "none",
    willChange: "transform, opacity",
  });
  const art = source.querySelector("img, svg")?.cloneNode(true) as HTMLElement | undefined;
  if (art) {
    art.removeAttribute("class");
    Object.assign(art.style, { width: "100%", height: "100%", objectFit: "contain" });
    ghost.appendChild(art);
  }
  document.body.appendChild(ghost);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height * 0.38 - (from.top + from.height / 2);
  const flight = ghost.animate(
    [
      { transform: "translate(0, 0) scale(1) rotate(0deg)", opacity: 1 },
      { transform: `translate(${dx * 0.45}px, ${Math.min(dy * 0.3, 0) - 110}px) scale(0.6) rotate(-14deg)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy - 26}px) scale(0.22) rotate(18deg)`, opacity: 1, offset: 0.86 },
      { transform: `translate(${dx}px, ${dy + 6}px) scale(0.12) rotate(24deg)`, opacity: 0 },
    ],
    { duration: 820, delay: 140, easing: inOut, fill: "forwards" },
  );

  flight.finished.finally(() => {
    ghost.remove();
    // Lid snaps shut with a bounce; the bin squashes as it lands.
    b.lid.animate([{ transform: "rotate(-48deg)" }, { transform: "rotate(10deg)", offset: 0.55 }, { transform: "rotate(0deg)" }], { duration: 380, easing: bounce, fill: "forwards" });
    b.svg.animate(
      [{ transform: "scale(1, 1)" }, { transform: "scale(1.12, 0.86)", offset: 0.3 }, { transform: "scale(0.95, 1.06)", offset: 0.65 }, { transform: "scale(1, 1)" }],
      { duration: 420, easing: out },
    );
    b.pending--;
    scheduleLeave(b);
  });
}
