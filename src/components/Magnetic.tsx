"use client";

import { useEffect } from "react";
import { cssEase, EASE } from "@/lib/motion";

const SELECTOR = ".btn, .btn-outline, .btn-dark";

/** A ripple grows from the exact point pressed on a pill button, then fades (mouse, touch and pen). */
function ripple(e: PointerEvent) {
  const el = (e.target as Element | null)?.closest<HTMLElement>(SELECTOR);
  if (!el || (el as HTMLButtonElement).disabled) return;
  const r = el.getBoundingClientRect();
  const size = Math.hypot(r.width, r.height) * 2;
  const dot = document.createElement("span");
  dot.className = "btn-ripple";
  dot.setAttribute("aria-hidden", "true");
  Object.assign(dot.style, { width: `${size}px`, height: `${size}px`, left: `${e.clientX - r.left - size / 2}px`, top: `${e.clientY - r.top - size / 2}px` });
  el.appendChild(dot);
  dot
    .animate([{ transform: "scale(0)", opacity: 0.28 }, { transform: "scale(1)", opacity: 0 }], { duration: 650, easing: cssEase(EASE.out) })
    .finished.finally(() => dot.remove());
}

/**
 * Site-wide micro-interactions on pill buttons (.btn, .btn-outline, .btn-dark):
 * - they lean toward the mouse pointer and spring back on leave (mouse only). Uses the CSS
 *   `translate` property so it never fights the press `scale` (see globals.css);
 * - a ripple from the point pressed.
 * Off for reduced-motion users.
 */
export function Magnetic() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    document.addEventListener("pointerdown", ripple, { passive: true });
    return () => document.removeEventListener("pointerdown", ripple);
  }, []);

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let current: HTMLElement | null = null;
    const release = () => {
      if (current) current.style.translate = "";
      current = null;
    };
    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>(SELECTOR) ?? null;
      if (el !== current) release();
      if (!el || (el as HTMLButtonElement).disabled) return;
      current = el;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * 0.28;
      const y = (e.clientY - (r.top + r.height / 2)) * 0.4;
      el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", release);
    window.addEventListener("blur", release);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", release);
      window.removeEventListener("blur", release);
    };
  }, []);
  return null;
}
