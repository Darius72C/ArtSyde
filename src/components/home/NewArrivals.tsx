"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion } from "motion/react";
import { cart } from "@/lib/cart";
import { flyToCart } from "@/lib/flyToCart";
import { gsap, useGSAP } from "@/lib/gsap";
import { formatFCFA, type Product } from "@/lib/products";
import { ProductImage } from "../ProductImage";
import { RevealLines, Tilt } from "../Reveal";
import { DUR, EASE, STAGGER, VIEWPORT } from "@/lib/motion";

/**
 * New arrivals. Desktop: the section pins and vertical scrolling drives the rail sideways.
 * Mobile: a normal swipeable, snap-scrolling rail.
 */
/** `products` come from the database (src/lib/catalog.ts), read by the home page. */
export function NewArrivals({ products }: { products: Product[] }) {
  const root = useRef<HTMLElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const items = products.filter((p) => p.tag === "Nouveau" || p.tag === "Best-seller");

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const track = rail.current!;
        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
        const tl = gsap.timeline({
          scrollTrigger: { trigger: root.current, start: "top top", end: () => `+=${distance()}`, pin: true, scrub: 0.8, invalidateOnRefresh: true },
        });
        tl.to(track, { x: () => -distance(), ease: "none" }, 0).fromTo(".na-progress", { scaleX: 0 }, { scaleX: 1, ease: "none" }, 0);
        // Cards drift at slightly different speeds for depth.
        gsap.utils.toArray<HTMLElement>(".na-card .na-art").forEach((el, i) => {
          tl.fromTo(el, { xPercent: 10 + (i % 3) * 4 }, { xPercent: -10 - (i % 3) * 4, ease: "none" }, 0);
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="nouveautes" className="flex flex-col justify-center overflow-hidden py-20 md:min-h-svh md:pb-10 md:pt-20">
      <div className="mx-auto flex w-full max-w-[1180px] items-end justify-between gap-6 px-5">
        <RevealLines lines={[{ text: "Les nouveautés.", muted: "Fraîchement imprimées." }]} className="display max-w-2xl text-[clamp(2rem,4.5vw,3.25rem)]" />
        <div className="hidden h-[3px] w-40 overflow-hidden rounded-full bg-surface md:block" aria-hidden>
          <span className="na-progress block h-full origin-left scale-x-0 rounded-full bg-ink" />
        </div>
      </div>
      <div ref={rail} className="rail mt-10 flex gap-5 overflow-x-auto px-5 pb-4 md:w-max md:overflow-visible md:px-[max(20px,calc((100vw-1180px)/2+20px))]">
        {items.map((p, i) => (
          <motion.article
            key={p.id}
            initial={{ opacity: 0, x: 80, rotate: 2 }}
            whileInView={{ opacity: 1, x: 0, rotate: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: DUR.reveal, ease: EASE.out, delay: i * STAGGER.item }}
            className="na-card group w-[78vw] shrink-0 sm:w-[340px] md:w-[400px]"
          >
            <Tilt className="tile flex h-full flex-col p-7">
              <p className="eyebrow">{p.tag === "Nouveau" ? "Nouveau" : "Le plus vendu"}</p>
              <h3 className="display mt-1 text-[28px]">{p.name}</h3>
              <p className="mt-1 text-muted">À partir de {formatFCFA(p.price)}</p>
              <div className="na-art my-6 md:my-4" style={{ transform: "translateZ(40px)" }}>
                <ProductImage color={p.colors[0]} art={p.art} photo={p.photo} alt={p.name} bg="transparent" className="mx-auto aspect-square w-full rounded-[22px] md:w-auto md:h-[min(320px,34svh)]" />
              </div>
              <div className="mt-auto flex items-center justify-between">
                <div className="flex gap-1.5">
                  {p.colors.map((c) => (
                    <span key={c} className="h-3 w-3 rounded-full ring-1 ring-ink/25" style={{ background: c }} />
                  ))}
                </div>
                <button
                  onClick={(e) => {
                    cart.add({ productId: p.id, name: p.name, price: p.price, color: p.colors[0], size: p.sizes.includes("M") ? "M" : (p.sizes[0] ?? "M"), art: p.art, bg: p.bg, photo: p.photo });
                    flyToCart(e.currentTarget.closest(".na-card")?.querySelector(".na-art") ?? null);
                  }}
                  className="btn !px-4 !py-1.5 !text-[14px]"
                >
                  Acheter
                </button>
              </div>
            </Tilt>
          </motion.article>
        ))}
        <Link href="/#boutique" className="tile group flex w-[60vw] shrink-0 flex-col items-center justify-center gap-2 p-7 text-center sm:w-[260px]">
          <span className="display text-[24px] transition-transform duration-500 group-hover:-translate-y-1">Tout voir</span>
          <span className="link-line">La boutique <span className="arrow">›</span></span>
        </Link>
      </div>
    </section>
  );
}
