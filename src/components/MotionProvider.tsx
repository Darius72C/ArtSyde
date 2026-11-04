"use client";

import { MotionConfig } from "motion/react";
import { DUR, EASE } from "@/lib/motion";

/**
 * Site-wide Motion settings:
 * - the house curve and duration for an element that sets no `transition` at all. An element's own
 *   `transition` replaces this default entirely, so always pass `ease` next to `duration`;
 * - "user": people who turned on reduced motion on their device get fades only,
 *   no movement (transforms and layout animations are switched off).
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: DUR.base, ease: EASE.out }}>
      {children}
    </MotionConfig>
  );
}
