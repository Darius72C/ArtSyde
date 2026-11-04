"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { teeState } from "../story/teeState";

const TeeScene = dynamic(() => import("../story/TeeScene"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 m-auto h-10 w-10 animate-spin rounded-full border-2 border-on-night/20 border-t-on-night" aria-hidden />,
});

const STEPS = [
  { t: "Coupe oversize. Coton épais.", s: "Une coupe ample aux épaules tombantes, dans un coton épais et souple." },
  { t: "Ton design, devant et dos.", s: "Une image, un texte, placés au millimètre dans le studio 3D." },
  { t: "Imprimé dans notre atelier.", s: "Exactement comme à l'écran, contrôlé à la main, livré chez toi." },
];

/** Pinned, Apple-style product story: the 3D tee turns and recolours while the copy changes. */
export function ScrollStory() {
  const root = useRef<HTMLElement>(null);
  // Start the 3D scene when the section is getting close, not with the page (the hero has its own).
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setNear(true), io.disconnect()), { rootMargin: "40% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        Object.assign(teeState, { hex: null, colorT: 0, design: 0, rotY: -0.5, scrollRot: 0, scale: 0.85, parallax: 0.4 });
        const steps = q(".story-step");
        const bars = q(".story-bar > span > span");
        gsap.set(steps, { autoAlpha: 0, y: 40 });
        gsap.set(steps[0], { autoAlpha: 1, y: 0 });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "+=300%",
            pin: true,
            scrub: 0.8,
            onUpdate: (self) => bars.forEach((b, i) => gsap.set(b, { scaleX: Math.min(1, Math.max(0, self.progress * 3 - i)) })),
          },
        });
        // The tee turns slowly to show its cut (shoulders, sleeves, length), then faces front for the print.
        tl.to(teeState, { scale: 1, rotY: 1.15, duration: 2.4, ease: "power1.inOut" }, 0)
          .to(steps[0], { autoAlpha: 0, y: -40, duration: 0.4 }, 2.4)
          .to(steps[1], { autoAlpha: 1, y: 0, duration: 0.4 }, 2.8)
          .to(teeState, { rotY: -0.2, duration: 0.8 }, 2.6)
          .to(teeState, { design: 1, scale: 1.08, duration: 1 }, 2.8)
          .to(steps[1], { autoAlpha: 0, y: -40, duration: 0.4 }, 4.4)
          .to(steps[2], { autoAlpha: 1, y: 0, duration: 0.4 }, 4.8)
          .to(teeState, { rotY: -0.2 + Math.PI * 2, scale: 1, duration: 1.8, ease: "power1.inOut" }, 4.6)
          .to({}, { duration: 0.6 });
        return () => tl.scrollTrigger?.kill();
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        Object.assign(teeState, { hex: null, colorT: 0, design: 1, rotY: 0, scale: 1 });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} data-nav-dark className="relative h-svh overflow-hidden bg-night text-on-night">
      <div className="absolute inset-x-0 top-[calc(48px+4svh)] z-10 px-5 text-center md:top-[calc(48px+6svh)]">
        <div className="relative mx-auto h-[8.5rem] max-w-3xl md:h-40">
          {STEPS.map((s, i) => (
            <div key={s.t} className={`story-step absolute inset-x-0 top-0 ${i > 0 ? "invisible" : ""}`}>
              <h2 className="display text-[clamp(2.2rem,6vw,4.5rem)]">{s.t}</h2>
              <p className="mx-auto mt-3 max-w-lg text-[17px] text-night-muted md:text-[21px]">{s.s}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-[8%] top-[30%] md:bottom-[6%] md:top-[36%]">
        {near && <TeeScene />}
      </div>
      <div className="story-bar absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 gap-2" aria-hidden>
        {STEPS.map((s) => (
          <span key={s.t} className="relative block h-1 w-10 overflow-hidden rounded-full bg-on-night/20">
            <span className="absolute inset-0 origin-left scale-x-0 rounded-full bg-on-night" />
          </span>
        ))}
      </div>
    </section>
  );
}
