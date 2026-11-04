"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { gsap, useGSAP } from "@/lib/gsap";
import { RevealLines } from "../Reveal";
import { heroState } from "../story/heroState";
import { DUR, EASE, STAGGER } from "@/lib/motion";

// The three real 3D tees (WebGL, browser only). They fade in once the model has loaded.
const HeroTees = dynamic(() => import("../story/HeroTees"), { ssr: false, loading: () => null });

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // On scroll, the side tees tuck in behind the centre one and everything lifts.
        gsap.fromTo(heroState, { spread: 1 }, { spread: 0.7, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true } });
        gsap.to(".hero-stage", { yPercent: -8, scale: 0.96, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true } });
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="overflow-hidden px-5 pb-16 pt-14 text-center md:pt-20"
      onPointerMove={(e) => {
        // The tees follow the mouse in depth (mouse only, off with reduced motion).
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        heroState.px = ((e.clientX - r.left) / r.width) * 2 - 1;
        heroState.py = ((e.clientY - r.top) / r.height) * 2 - 1;
      }}
      onPointerLeave={() => {
        heroState.px = 0;
        heroState.py = 0;
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

      <div className="hero-stage relative mx-auto mt-14 aspect-[16/9] max-w-[980px] md:mt-16" aria-hidden>
        <HeroTees />
      </div>
    </section>
  );
}
