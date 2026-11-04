"use client";

import { cssEase, DUR, EASE } from "./motion";

/** The header listens for this to make the bag icon bounce. */
export const CART_BUMP = "cart:bump";

/**
 * Micro-interaction for "add to cart": a copy of the product visual flies from
 * `source` to the bag icon in the header, then the icon bounces.
 */
export function flyToCart(source: Element | null) {
  if (typeof window === "undefined") return;
  const bump = () => window.dispatchEvent(new Event(CART_BUMP));
  const target = [...document.querySelectorAll<HTMLElement>("#cart-link")].find((el) => el.offsetParent !== null);
  if (!source || !target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return bump();

  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const size = Math.min(from.width, from.height, 220);
  const ghost = document.createElement("div");
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${from.left + from.width / 2 - size / 2}px`,
    top: `${from.top + from.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    zIndex: "100",
    pointerEvents: "none",
    willChange: "transform, opacity",
  });
  const art = source.querySelector("svg, img")?.cloneNode(true) as HTMLElement | undefined;
  if (art) {
    art.removeAttribute("class");
    Object.assign(art.style, { width: "100%", height: "100%", objectFit: "contain" });
    ghost.appendChild(art);
  }
  document.body.appendChild(ghost);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  // A gentle arc: rise a little first, then dive into the bag.
  const anim = ghost.animate(
    [
      { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1 },
      { transform: `translate(${dx * 0.35}px, ${dy * 0.35 - 120}px) scale(0.55) rotate(-8deg)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.06) rotate(0deg)`, opacity: 0.3 },
    ],
    { duration: DUR.slow * 1000, easing: cssEase(EASE.inOut), fill: "forwards" },
  );
  anim.onfinish = () => {
    ghost.remove();
    bump();
  };
}
