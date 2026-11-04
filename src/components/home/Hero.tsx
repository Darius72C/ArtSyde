"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";
import { gsap, useGSAP } from "@/lib/gsap";
import { TeeIllustration } from "../ProductImage";
import { RevealLines } from "../Reveal";
import { DUR, EASE, SPRING, STAGGER } from "@/lib/motion";

// `depth`: how far each tee follows the mouse. The front one moves most, so the stack reads as layered.
const TEES = [
  { color: "#1F2A44", art: "line", x: "-62%", r: -10, s: 0.78, d: 0.5, depth: 0.45 },
  { color: "#F4F2EC", art: "wordmark", x: "0%", r: 0, s: 1, d: 0.35, depth: 1 },
  { color: "#C8102E", art: "sun", x: "62%", r: 10, s: 0.78, d: 0.6, depth: 0.45 },
] as const;
const REACH = { x: 26, y: 14, turn: 2.5 }; // px, px, deg at full depth with the mouse at the edge

/** Moves its content with the mouse, scaled by `depth`. */
function Depth({ px, py, depth, children }: { px: MotionValue<number>; py: MotionValue<number>; depth: number; children: ReactNode }) {
  const x = useTransform(px, (v) => v * REACH.x * depth);
  const y = useTransform(py, (v) => v * REACH.y * depth);
  const rotate = useTransform(px, (v) => v * REACH.turn * depth);
  return (
    <motion.div className="h-full w-full" style={{ x, y, rotate }}>
      {children}
    </motion.div>
  );
}

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  // Mouse position over the hero, -1..1 on each axis, smoothed.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const px = useSpring(mx, SPRING.follow);
  const py = useSpring(my, SPRING.follow);
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
    <section
      ref={root}
      className="overflow-hidden px-5 pb-16 pt-14 text-center md:pt-20"
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
        my.set(((e.clientY - r.top) / r.height) * 2 - 1);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
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

      <div className="hero-stage relative mx-auto mt-14 aspect-[16/9] max-w-[980px] md:mt-16">
        {TEES.map((t, i) => (
          <motion.div
            key={t.color}
            className={`absolute left-1/2 top-0 h-full w-[46%] ${i === 0 ? "hero-side-l z-0" : i === 2 ? "hero-side-r z-0" : "z-10"}`}
            style={{ marginLeft: "-23%" }}
            initial={{ opacity: 0, y: 80, x: "0%", rotate: 0, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, x: t.x, rotate: t.r, scale: t.s }}
            transition={{ duration: DUR.grand, ease: EASE.out, delay: t.d }}
          >
            <Depth px={px} py={py} depth={t.depth}>
              <div className="idle-float h-full w-full" style={{ animationDelay: `${i * -2}s` }}>
                <TeeIllustration color={t.color} art={t.art} className="h-full w-full drop-shadow-[0_40px_40px_rgba(0,0,0,0.18)]" />
              </div>
            </Depth>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
