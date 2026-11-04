"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { SPRING } from "@/lib/motion";

// ---- colour maths (HSV <-> hex) ----
export function hsvToHex(h: number, s: number, v: number) {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return "#" + [f(5), f(3), f(1)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
}
export function hexToHsv(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  let h = 0;
  if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max };
}
const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v);

/** Drag helper: calls back with the pointer position (0..1) inside the element. */
function useDrag(onMove: (x: number, y: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const handle = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    onMove(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)));
  };
  return {
    ref,
    onPointerDown: (e: React.PointerEvent) => {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      handle(e);
    },
    onPointerMove: (e: React.PointerEvent) => e.buttons && handle(e),
  };
}

type Props = { initial: string; presets: readonly { name: string; hex: string }[]; onChange: (hex: string) => void };

/** Free colour picker: saturation/brightness gradient + hue rainbow + hex field + presets + eyedropper. */
export function ColorPicker({ initial, presets, onChange }: Props) {
  const [hsv, setHsv] = useState(() => hexToHsv(initial));
  const [text, setText] = useState(initial);
  const hex = hsvToHex(hsv.h, hsv.s, hsv.v);

  const set = (next: { h: number; s: number; v: number }) => {
    setHsv(next);
    const h = hsvToHex(next.h, next.s, next.v);
    setText(h);
    onChange(h);
  };
  const setHex = (h: string) => {
    const lower = h.toLowerCase();
    const next = hexToHsv(lower);
    // keep the current hue for greys (hue is undefined when saturation is 0)
    setHsv(next.s === 0 ? { ...next, h: hsv.h } : next);
    setText(lower);
    onChange(lower);
  };

  const sv = useDrag((x, y) => set({ ...hsv, s: x, v: 1 - y }));
  const hue = useDrag((x) => set({ ...hsv, h: x * 359.9 }));

  const canPick = typeof window !== "undefined" && "EyeDropper" in window;
  const pick = async () => {
    try {
      // @ts-expect-error EyeDropper is not in TS's DOM lib yet (Chromium only)
      const res = await new window.EyeDropper().open();
      setHex(res.sRGBHex);
    } catch {}
  };

  return (
    <div className="space-y-5">
      {/* Saturation (x) / brightness (y) gradient */}
      <div
        {...sv}
        role="slider"
        aria-label="Saturation et luminosité"
        aria-valuenow={Math.round(hsv.s * 100)}
        aria-valuetext={hex}
        tabIndex={0}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 0.1 : 0.02;
          const m: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
          const d = m[e.key];
          if (!d) return;
          e.preventDefault();
          set({ ...hsv, s: Math.min(1, Math.max(0, hsv.s + d[0])), v: Math.min(1, Math.max(0, hsv.v + d[1])) });
        }}
        className="relative aspect-[4/3] w-full cursor-crosshair touch-none outline-none focus-visible:ring-1 focus-visible:ring-ink focus-visible:ring-offset-4 focus-visible:ring-offset-bg"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))`,
        }}
      >
        <motion.span
          className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.4)]"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: hex }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 1.3 }}
          transition={SPRING.pop}
        />
      </div>

      {/* Hue rainbow */}
      <div
        {...hue}
        role="slider"
        aria-label="Teinte"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsv.h)}
        tabIndex={0}
        onKeyDown={(e) => {
          const d = e.key === "ArrowLeft" ? -5 : e.key === "ArrowRight" ? 5 : 0;
          if (!d) return;
          e.preventDefault();
          set({ ...hsv, h: (hsv.h + d + 360) % 360 });
        }}
        className="relative h-2 w-full cursor-pointer touch-none outline-none focus-visible:ring-1 focus-visible:ring-ink focus-visible:ring-offset-4 focus-visible:ring-offset-bg"
        style={{ background: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" }}
      >
        <span
          className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.4)]"
          style={{ left: `${(hsv.h / 360) * 100}%`, background: `hsl(${hsv.h} 100% 50%)` }}
        />
      </div>

      {/* Hex + eyedropper */}
      <div className="flex items-end gap-4">
        <span className="h-9 w-9 shrink-0 rounded-full ring-1 ring-line" style={{ background: hex }} />
        <label className="flex flex-1 items-center">
          <span className="sr-only">Code couleur</span>
          <input
            value={text}
            onChange={(e) => {
              const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
              setText(v);
              if (isHex(v)) setHex(v);
            }}
            maxLength={7}
            spellCheck={false}
            className="field !py-2 text-sm tracking-[0.15em] uppercase"
          />
        </label>
        {canPick && (
          <button onClick={pick} aria-label="Pipette : prendre une couleur à l'écran" className="grid h-9 w-9 shrink-0 place-items-center text-muted transition hover:text-ink">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 22l1-4 11-11 3 3L6 21z" />
              <path d="M14 7l3-3a2.1 2.1 0 0 1 3 3l-3 3" />
            </svg>
          </button>
        )}
      </div>

      {/* Presets */}
      <div>
        <p className="eyebrow mb-3">Coloris en stock</p>
        <div className="flex flex-wrap gap-3">
          {presets.map((c) => (
            <motion.button
              key={c.hex}
              whileTap={{ scale: 0.8 }}
              transition={SPRING.pop}
              onClick={() => setHex(c.hex)}
              title={c.name}
              aria-label={c.name}
              aria-pressed={hex === c.hex.toLowerCase()}
              className={`h-6 w-6 rounded-full ring-1 ring-offset-[3px] ring-offset-bg transition ${hex === c.hex.toLowerCase() ? "ring-ink" : "ring-line hover:ring-muted"}`}
              style={{ background: c.hex }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Closest colour in a list (simple RGB distance) — used to show the nearest in-stock blank. */
export function nearest<T extends { hex: string }>(hex: string, list: readonly T[]) {
  const rgb = (h: string) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r, g, b] = rgb(hex);
  return list.reduce((best, c) => {
    const [r2, g2, b2] = rgb(c.hex);
    const d = (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2;
    return d < best.d ? { c, d } : best;
  }, { c: list[0], d: Infinity }).c;
}
