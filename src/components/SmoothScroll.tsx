"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { gsap, ScrollTrigger } from "@/lib/gsap";

let lenis: Lenis | null = null;

/** A full page load that came from another page of this site (e.g. a server redirect). */
function sameSiteReferrer() {
  try {
    return Boolean(document.referrer) && new URL(document.referrer).origin === location.origin;
  } catch {
    return false;
  }
}

/** Scrolls so the hero's cards sit just under the header (no glide: the page is just arriving). */
function toCards(cards: HTMLElement) {
  const offset = -72;
  if (lenis) lenis.scrollTo(cards, { offset, immediate: true });
  else window.scrollTo({ top: cards.getBoundingClientRect().top + window.scrollY + offset, behavior: "instant" });
}

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
  // Coming to the home page from another page of the site (a link, the logo, a redirect after signing in,
  // deleting the account…), it opens on the hero's three cards rather than on its title. A direct visit
  // (typed address, a search result) still starts at the very top.
  const previous = useRef<string | null>(null);
  useEffect(() => {
    const cameFrom = previous.current;
    previous.current = pathname;
    const hash = window.location.hash;
    const target = hash ? document.querySelector(hash) : null;
    let frame = 0;
    if (target) {
      if (lenis) lenis.scrollTo(target as HTMLElement, { offset: -90, immediate: true });
    } else if (pathname === "/" && (cameFrom ? cameFrom !== "/" : sameSiteReferrer())) {
      // The new page may still be fading in: wait for the cards (about 1.5 s at most).
      const started = performance.now();
      const land = () => {
        const cards = document.getElementById("cartes");
        if (cards) return toCards(cards);
        if (performance.now() - started < 1500) frame = requestAnimationFrame(land);
      };
      land();
    } else if (lenis) lenis.scrollTo(0, { immediate: true });
    const id = setTimeout(() => ScrollTrigger.refresh(), 150);
    return () => {
      clearTimeout(id);
      cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return null;
}
