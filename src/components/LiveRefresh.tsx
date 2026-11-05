"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { useLive } from "@/lib/use-live";

/**
 * Refreshes the page's server data when a live stream says something changed (an order's status, the stock),
 * without reloading: the page keeps its state (cart, choices, scroll). Renders nothing.
 */
export function LiveRefresh({ src, events }: { src: string; events: string[] }) {
  const router = useRouter();
  const timer = useRef<number | undefined>(undefined);
  useLive(src, events, () => {
    // Several changes in a row → one refresh.
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => router.refresh(), 400);
  });
  return null;
}
