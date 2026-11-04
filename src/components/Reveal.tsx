"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { DUR, EASE, SPRING, STAGGER, VIEWPORT } from "@/lib/motion";

/** A headline line: plain text, or `{ text, muted }` where `muted` is shown in grey after `text`. */
export type Line = string | { text?: string; muted?: string };

function words(text: string, key: string, className?: string) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((w, i) => [
      i > 0 ? " " : null,
      <Word key={`${key}-${i}`} className={className}>
        {w}
      </Word>,
    ]);
}

function Word({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-bottom">
      <motion.span
        className={`inline-block ${className}`}
        variants={{ hidden: { y: "105%", rotate: 4 }, show: { y: "0%", rotate: 0, transition: { duration: DUR.reveal, ease: EASE.out } } }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/** Headline whose words rise one after the other from behind a mask. */
export function RevealLines({ lines, className = "", delay = 0, as = "h2" }: { lines: Line[]; className?: string; delay?: number; as?: "h1" | "h2" | "h3" | "p" }) {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={VIEWPORT}
      variants={{ hidden: {}, show: { transition: { staggerChildren: STAGGER.word, delayChildren: delay } } }}
    >
      {lines.map((l, i) => (
        <motion.span key={i} className="block" variants={{ hidden: {}, show: { transition: { staggerChildren: STAGGER.word } } }}>
          {typeof l === "string" ? (
            words(l, `l${i}`)
          ) : (
            <>
              {l.text && words(l.text, `t${i}`)}
              {l.text && l.muted && " "}
              {l.muted && words(l.muted, `m${i}`, "text-muted")}
            </>
          )}
        </motion.span>
      ))}
    </Tag>
  );
}

/** FadeUp's move as props, for an element that must stay itself (a ref, pointer handlers, grid order). */
export const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: VIEWPORT,
  transition: { duration: DUR.reveal, ease: EASE.out, delay },
});

/** Gentle fade-up when the element enters the viewport. */
export function FadeUp({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div className={className} {...fadeUp(delay)}>
      {children}
    </motion.div>
  );
}

/** Image that fades in while settling from a slight zoom. */
export function RevealImage({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={`overflow-hidden ${className}`}
      initial={{ opacity: 0, scale: 0.94 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={VIEWPORT}
      transition={{ duration: DUR.hero, ease: EASE.out, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Number that counts up from 0 when it scrolls into view (writes to the DOM, no re-renders). */
export function CountUp({ to, className = "", duration = DUR.grand }: { to: number; className?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, VIEWPORT);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!inView || !el) return;
    const show = (v: number) => (el.textContent = Math.round(v).toLocaleString("fr-FR"));
    if (reduce) return void show(to);
    const c = animate(0, to, { duration, ease: EASE.expo, onUpdate: show });
    return () => c.stop();
  }, [inView, to, duration, reduce]);
  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      0
    </span>
  );
}

/** Card that tilts toward the pointer in 3D, with a soft light sheen following it. */
export function Tilt({ children, className = "", max = 7 }: { children: ReactNode; className?: string; max?: number }) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, SPRING.follow);
  const sy = useSpring(py, SPRING.follow);
  const rotateY = useTransform(sx, [0, 1], [-max, max]);
  const rotateX = useTransform(sy, [0, 1], [max, -max]);
  const sheen = useTransform([sx, sy] as const, ([x, y]: number[]) => `radial-gradient(420px circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.16), transparent 55%)`);

  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={`relative [transform-style:preserve-3d] ${className}`}
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => {
        px.set(0.5);
        py.set(0.5);
      }}
      whileHover={{ scale: 1.015 }}
      transition={SPRING.ui}
    >
      {children}
      <motion.span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: sheen }} />
    </motion.div>
  );
}

/** Moves its content vertically at a different speed than the page while scrolling. */
export function Parallax({ children, className = "", offset = 60 }: { children: ReactNode; className?: string; offset?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [offset, -offset]);
  return (
    <motion.div ref={ref} className={className} style={{ y }}>
      {children}
    </motion.div>
  );
}

/** Grows from slightly smaller to full size as it scrolls toward the middle of the screen. */
export function ScrollScale({ children, className = "", from = 0.86 }: { children: ReactNode; className?: string; from?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const scale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [from, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], reduce ? [1, 1] : [0.3, 1]);
  return (
    <motion.div ref={ref} className={className} style={{ scale, opacity }}>
      {children}
    </motion.div>
  );
}
