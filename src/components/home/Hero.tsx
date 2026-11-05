"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import type { Product } from "@/lib/products";
import type { HeroCardView } from "@/server/hero";
import { RevealLines } from "../Reveal";
import { DUR, EASE, SPRING, STAGGER } from "@/lib/motion";

/*
 * The hero's cards (up to three): ad visuals, not product listings: an image each, no name, price or link
 * (the buttons above lead to the shop and the studio). The front card is the biggest.
 * x: offset from the centre (% of the stage width), r: tilt (deg), s: scale,
 * depth: how far it follows the mouse (the front one most), d: entrance delay (s).
 */
const SLOTS = [
  { x: 0, r: 0, s: 1, z: 3, depth: 1, d: 0.35 },
  { x: -29, r: -8, s: 0.82, z: 2, depth: 0.5, d: 0.5 },
  { x: 29, r: 8, s: 0.82, z: 1, depth: 0.5, d: 0.6 },
] as const;

/** What a card shows: one image. */
type Card = { key: string; photo: string };

/**
 * Stand-ins for empty places: real photos only, never the illustrated tee, the ones uploaded from the admin
 * (on R2, a full URL) of the newest products, newest first. A local path is skipped, it may point to a file
 * this copy of the site doesn't have.
 */
function newest(products: Product[]): Card[] {
  const recent = [...products].reverse(); // the catalogue is oldest first
  return recent
    .flatMap((p) => p.photos.filter((url) => /^https?:\/\//.test(url)).map((url) => ({ key: url, photo: url })))
    .slice(0, SLOTS.length);
}

/**
 * The cards: the ones set in the admin (/admin/accueil) in their places, and in an empty place the next
 * photo of the newest products. No card set at all: the newest products' photos.
 */
function pickCards(set: HeroCardView[], products: Product[]): Card[] {
  const fill = newest(products).filter((c) => !set.some((s) => s.image === c.photo));
  const out: Card[] = [];
  for (let slot = 0; slot < SLOTS.length; slot++) {
    const s = set.find((x) => x.slot === slot);
    const c = s ? { key: s.image, photo: s.image } : fill.shift();
    if (c) out.push(c);
  }
  return out;
}

function HeroCard({ card, slot, spread, px, py, still }: { card: Card; slot: (typeof SLOTS)[number]; spread: MotionValue<number>; px: MotionValue<number>; py: MotionValue<number>; still: boolean }) {
  // On scroll the side cards tuck in behind the front one; the mouse moves each by its depth.
  const left = useTransform(spread, (s) => `${50 + slot.x * s}%`);
  const x = useTransform(px, (v) => v * 18 * slot.depth);
  const y = useTransform(py, (v) => v * 10 * slot.depth);
  const rotateY = useTransform(px, (v) => v * 7 * slot.depth);
  const rotateX = useTransform(py, (v) => -v * 5 * slot.depth);

  return (
    <motion.div className="absolute top-1/2 h-[92%] [perspective:1200px]" style={{ left, zIndex: slot.z, x, y, aspectRatio: "4 / 5", translateX: "-50%", translateY: "-50%" }}>
      <motion.div
        className="h-full w-full"
        initial={{ opacity: 0, y: 90, rotate: 0, scale: slot.s * 0.9 }}
        animate={{ opacity: 1, y: 0, rotate: slot.r, scale: slot.s }}
        transition={{ duration: DUR.hero, ease: EASE.out, delay: slot.d }}
      >
        {/* A slow float, out of step from card to card. */}
        <motion.div
          className="h-full w-full"
          animate={still ? undefined : { y: [0, -10, 0] }}
          transition={{ duration: 6 + slot.z, ease: EASE.inOut, repeat: Infinity, delay: slot.d }}
          style={{ rotateX, rotateY }}
        >
          <div className="h-full w-full overflow-hidden rounded-[28px] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45)] ring-1 ring-ink/10">
            {/* eslint-disable-next-line @next/next/no-img-element -- photos live on R2, whose public domain is set per deployment */}
            <img src={card.photo} alt="" draggable={false} loading="eager" fetchPriority={slot.z === 3 ? "high" : "auto"} decoding="async" className="h-full w-full bg-surface object-cover" />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/** `cards` are the ones set in the admin; `products` (the catalogue) fill the empty places with their newest photos. */
export function Hero({ products = [], cards: set = [] }: { products?: Product[]; cards?: HeroCardView[] }) {
  const root = useRef<HTMLElement>(null);
  const reduce = Boolean(useReducedMotion());
  const cards = pickCards(set, products);

  // Scroll: from the top of the hero to its end, the fan closes a little and the stage lifts.
  const { scrollYProgress } = useScroll({ target: root, offset: ["start start", "end start"] });
  const spread = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 0.72]);
  const lift = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "-8%"]);
  const shrink = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 0.96]);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const px = useSpring(rawX, SPRING.follow);
  const py = useSpring(rawY, SPRING.follow);

  return (
    <section
      ref={root}
      className="overflow-hidden px-5 pb-16 pt-14 text-center md:pt-20"
      onPointerMove={(e) => {
        // The cards follow the mouse in depth (mouse only, off with reduced motion).
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        rawX.set(((e.clientX - r.left) / r.width) * 2 - 1);
        rawY.set(((e.clientY - r.top) / r.height) * 2 - 1);
      }}
      onPointerLeave={() => {
        rawX.set(0);
        rawY.set(0);
      }}
    >
      <motion.p className="eyebrow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DUR.slow, ease: EASE.out }}>
        Nouvelle collection
      </motion.p>
      <RevealLines
        as="h1"
        delay={0.1}
        lines={["Ton t-shirt.", { muted: "Ton style." }]}
        className="display mx-auto mt-3 max-w-4xl text-[clamp(3rem,9vw,6rem)]"
      />
      <motion.p className="lead mx-auto mt-5 max-w-xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DUR.reveal, ease: EASE.out, delay: 0.1 + STAGGER.item }}>
        Imprimé dans notre atelier. Choisis un modèle, ou crée le tien en 3D en deux minutes.
      </motion.p>
      <motion.div className="mt-8 flex flex-wrap items-center justify-center gap-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DUR.reveal, ease: EASE.out, delay: 0.1 + STAGGER.item * 2 }}>
        <Link href="/#boutique" className="btn">
          Acheter
        </Link>
        <Link href="/studio" className="link-line">
          Créer le mien <span className="arrow">›</span>
        </Link>
      </motion.div>

      {cards.length > 0 && (
        <motion.div className="relative mx-auto mt-14 aspect-[4/3] max-w-[980px] sm:aspect-[16/9] md:mt-16" style={{ y: lift, scale: shrink }} aria-hidden>
          {cards.map((c, i) => (
            <HeroCard key={c.key} card={c} slot={SLOTS[i]} spread={spread} px={px} py={py} still={reduce} />
          ))}
        </motion.div>
      )}
    </section>
  );
}
