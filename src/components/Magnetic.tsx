"use client";

import { useEffect } from "react";

const SELECTOR = ".btn, .btn-outline, .btn-dark";

/**
 * Site-wide micro-interaction: pill buttons lean toward the mouse pointer and spring back on leave.
 * Uses the CSS `translate` property so it never fights the `:active` scale (a `transform`).
 * Mouse only, and off for reduced-motion users.
 */
export function Magnetic() {
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
