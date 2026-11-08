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

/**
 * Puts an element `gap` px from the top of the window, at once (the page is just arriving). The position is
 * worked out here and given to Lenis as a number, so the page's scroll-padding isn't counted twice.
 */
function jumpTo(el: HTMLElement, gap: number) {
  const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - gap);
  if (lenis) lenis.scrollTo(top, { immediate: true, force: true });
  else window.scrollTo({ top, behavior: "instant" });
}
/** A section's top just under the header. */
const toSection = (el: HTMLElement) => jumpTo(el, 90);
/** The hero's three cards just under the header. */
const toCards = (cards: HTMLElement) => jumpTo(cards, 72);

/** Buttery smooth scrolling (Lenis) kept in sync with GSAP ScrollTrigger. Off for reduced-motion users. */
export function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // lerp: how much of the remaining distance is covered each frame (lower = longer, softer glide).
    // wheelMultiplier: distance per wheel notch (below 1 = each notch travels a little less).
    lenis = new Lenis({ autoRaf: false, anchors: false /* #section links: the browser jumps, stopping under the header (html { scroll-padding-top }) */, lerp: 0.07, wheelMultiplier: 0.8 });
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

  // New page: where it opens, then re-measure the scroll animations.
  // - With a #section (/#boutique, /#nouveautes, /#equipes, /#aide…): on that section, under the header.
  // - The home page, coming from another page of the site (a link, the logo, a redirect after signing in,
  //   deleting the account…): on the hero's three cards rather than on its title.
  // - Anything else, and a direct visit to the home page (typed address, a search result): at the top.
  // The new page may still be fading in, so the target is waited for (2 s at most). The pinned scroll story
  // grows the page once ScrollTrigger re-measures, which moves everything below it: the jump is made again
  // after that, and once more when images have settled, so a section below it isn't missed.
  const previous = useRef<string | null>(null);
  useEffect(() => {
    const cameFrom = previous.current;
    previous.current = pathname;
    const hash = decodeURIComponent(window.location.hash.slice(1));
    const toHome = !hash && pathname === "/" && (cameFrom ? cameFrom !== "/" : sameSiteReferrer());
    const find = () => (hash ? document.getElementById(hash) : toHome ? document.getElementById("cartes") : null);
    const go = (el: HTMLElement) => (hash ? toSection(el) : toCards(el));

    let frame = 0;
    const timers: number[] = [];
    if (hash || toHome) {
      const started = performance.now();
      const land = () => {
        const el = find();
        if (!el) {
          if (performance.now() - started < 2000) frame = requestAnimationFrame(land);
          return;
        }
        go(el);
        timers.push(
          window.setTimeout(() => {
            ScrollTrigger.refresh();
            go(el);
          }, 200),
          window.setTimeout(() => go(el), 800),
        );
      };
      land();
    } else {
      if (lenis) lenis.scrollTo(0, { immediate: true });
      else window.scrollTo({ top: 0, behavior: "instant" });
      timers.push(window.setTimeout(() => ScrollTrigger.refresh(), 150));
    }
    return () => {
      cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
    };
  }, [pathname]);

  return null;
}
