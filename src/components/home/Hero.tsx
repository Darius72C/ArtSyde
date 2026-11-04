"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion } from "motion/react";
import { gsap, useGSAP } from "@/lib/gsap";
import { TeeIllustration } from "../ProductImage";
import { RevealLines } from "../Reveal";

const EASE = [0.22, 1, 0.36, 1] as const;
const TEES = [
  { color: "#1F2A44", art: "line", x: "-62%", r: -10, s: 0.78, d: 0.5 },
  { color: "#F4F2EC", art: "wordmark", x: "0%", r: 0, s: 1, d: 0.35 },
  { color: "#C8102E", art: "sun", x: "62%", r: 10, s: 0.78, d: 0.6 },
] as const;

export function Hero() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // On scroll, the side tees slide in behind the centre one and everything lifts.
        gsap.to(".hero-side-l", { xPercent: 25, rotate: -4, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true } });
        gsap.to(".hero-side-r", { xPercent: -25, rotate: 4, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true } });
        gsap.to(".hero-stage", { yPercent: -8, scale: 0.96, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true } });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="overflow-hidden px-5 pb-16 pt-14 text-center md:pt-20">
      <motion.p className="eyebrow" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE }}>
        Nouvelle collection
      </motion.p>
      <RevealLines
        as="h1"
        delay={0.1}
        lines={["Ton t-shirt.", { muted: "Ton style." }]}
        className="display mx-auto mt-3 max-w-4xl text-[clamp(3rem,9vw,6rem)]"
      />
      <motion.p className="lead mx-auto mt-5 max-w-xl" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: EASE, delay: 0.18 }}>
        Imprimé dans notre atelier. Choisis un modèle, ou crée le tien en 3D en deux minutes.
      </motion.p>
      <motion.div className="mt-8 flex flex-wrap items-center justify-center gap-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: EASE, delay: 0.26 }}>
        <Link href="/#boutique" className="btn">
          Acheter
        </Link>
        <Link href="/studio" className="link-line">
          Créer le mien <span className="arrow">›</span>
        </Link>
      </motion.div>

      <div className="hero-stage relative mx-auto mt-14 aspect-[16/9] max-w-[980px] md:mt-16">
        {TEES.map((t, i) => (
          <motion.div
            key={t.color}
            className={`absolute left-1/2 top-0 h-full w-[46%] ${i === 0 ? "hero-side-l z-0" : i === 2 ? "hero-side-r z-0" : "z-10"}`}
            style={{ marginLeft: "-23%" }}
            initial={{ opacity: 0, y: 80, x: "0%", rotate: 0, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, x: t.x, rotate: t.r, scale: t.s }}
            transition={{ duration: 1.6, ease: EASE, delay: t.d }}
          >
            <div className="idle-float h-full w-full" style={{ animationDelay: `${i * -2}s` }}>
              <TeeIllustration color={t.color} art={t.art} className="h-full w-full drop-shadow-[0_40px_40px_rgba(0,0,0,0.18)]" />
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
