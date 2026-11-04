"use client";

import { motion } from "motion/react";
import { DUR, EASE, STAGGER } from "@/lib/motion";

/**
 * Order progress, drawn like the tracking on the customer's order page (OrderView):
 * a hairline, the done part in the accent colour, one dot per step.
 * `step` is the index of the last step reached, -1 when none is.
 */
export function Track({ steps, step }: { steps: string[]; step: number }) {
  return (
    <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      <span className="absolute left-0 right-0 top-[6px] h-0.5 rounded-full bg-line" />
      <motion.span
        className="absolute left-0 top-[6px] h-0.5 origin-left rounded-full bg-accent"
        initial={{ width: 0 }}
        animate={{ width: `${(Math.max(step, 0) / (steps.length - 1)) * 100}%` }}
        transition={{ delay: 0.5, duration: DUR.reveal, ease: EASE.out }}
      />
      {steps.map((t, i) => (
        <li key={t} className="relative pr-2" aria-current={i === step ? "step" : undefined}>
          <motion.span
            className={`block h-[14px] w-[14px] rounded-full border-2 ${i <= step ? "border-accent bg-accent" : "border-line bg-bg"}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 + i * STAGGER.line, duration: DUR.base, ease: EASE.out }}
          />
          <span className={`mt-3 block text-[14px] ${i <= step ? "font-medium" : "text-muted"}`}>{t}</span>
        </li>
      ))}
    </ol>
  );
}
