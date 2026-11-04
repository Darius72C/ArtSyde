"use client";

import { motion } from "motion/react";
import { DUR, EASE, VIEWPORT } from "@/lib/motion";

export type Bar = { label: string; value: number; display: string; note?: string };

/**
 * Column chart for one series (no legend: the panel title names it).
 * Columns grow from the baseline when the chart scrolls into view, capped at 24px wide,
 * 2px apart, rounded at the top only. Hover or focus a column for its day, amount and note;
 * the highest one carries its amount. Each column is also a list item with its own label,
 * so the numbers can be read without the picture.
 */
export function Bars({ data, label }: { data: Bar[]; label: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const top = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  const ticks = new Set([0, Math.floor((data.length - 1) / 2), data.length - 1]);

  return (
    <div>
      <ul aria-label={label} className="flex h-56 items-end gap-[2px] border-b border-line pt-8">
        {data.map((d, i) => {
          const h = (d.value / max) * 100;
          return (
            <li key={d.label} tabIndex={0} aria-label={`${d.label} : ${d.display}${d.note ? `, ${d.note}` : ""}`} className="group relative flex h-full min-w-0 flex-1 items-end justify-center rounded-t-[4px] outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <motion.span
                aria-hidden
                className="block w-full max-w-6 origin-bottom rounded-t-[4px] bg-accent transition-opacity duration-300 group-hover:opacity-80"
                style={{ height: `${h}%` }}
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={VIEWPORT}
                transition={{ duration: DUR.slow, ease: EASE.out, delay: (i / data.length) * DUR.base }}
              />
              {i === top && d.value > 0 && (
                <span aria-hidden className="pointer-events-none absolute -translate-y-full whitespace-nowrap pb-1.5 text-xs tabular-nums text-muted group-hover:opacity-0" style={{ bottom: `${h}%` }}>
                  {d.display}
                </span>
              )}
              <span
                aria-hidden
                className="pointer-events-none absolute z-10 mb-2 -translate-y-full whitespace-nowrap rounded-xl bg-bg px-3 py-2 text-xs opacity-0 shadow-[0_10px_40px_rgba(0,0,0,0.15)] transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
                style={{ bottom: `${h}%`, left: i > data.length / 2 ? "auto" : 0, right: i > data.length / 2 ? 0 : "auto" }}
              >
                <span className="block text-muted">{d.label}</span>
                <span className="block font-semibold tabular-nums">{d.display}</span>
                {d.note && <span className="block text-muted">{d.note}</span>}
              </span>
            </li>
          );
        })}
      </ul>
      <div aria-hidden className="mt-2 flex gap-[2px] text-xs text-muted">
        {data.map((d, i) => (
          <span key={d.label} className={`min-w-0 flex-1 whitespace-nowrap ${i === data.length - 1 ? "text-right" : i === 0 ? "text-left" : "text-center"}`}>
            {ticks.has(i) ? d.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
