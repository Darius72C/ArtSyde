"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { gsap, ScrollTrigger } from "@/lib/gsap";

let lenis: Lenis | null = null;

/** Buttery smooth scrolling (Lenis) kept in sync with GSAP ScrollTrigger. Off for reduced-motion users. */
export function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // lerp: how much of the remaining distance is covered each frame (lower = longer, softer glide).
    // wheelMultiplier: distance per wheel notch (below 1 = each notch travels a little less).
    lenis = new Lenis({ autoRaf: false, anchors: { offset: -90 }, lerp: 0.07, wheelMultiplier: 0.8 });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis?.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis?.destroy();
      lenis = null;
    };
  }, []);

  // New page: start at the top (or at the #anchor) and re-measure scroll animations.
  useEffect(() => {
    const hash = window.location.hash;
    const target = hash ? document.querySelector(hash) : null;
    if (target && lenis) lenis.scrollTo(target as HTMLElement, { offset: -90, immediate: true });
    else if (lenis) lenis.scrollTo(0, { immediate: true });
    const id = setTimeout(() => ScrollTrigger.refresh(), 150);
    return () => clearTimeout(id);
  }, [pathname]);

  return null;
}
