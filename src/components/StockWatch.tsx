"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const EVERY = 60_000;

/**
 * Keeps the shop's pages in step with the stock (a size sold out elsewhere turns « Épuisé ») without a live
 * stream: a small check every minute while the page is visible, and when it comes back to the screen. The
 * check is cached 30 s by the CDN (src/app/api/live/stock), so it rarely wakes a function. Renders nothing.
 */
export function StockWatch() {
  const router = useRouter();
  useEffect(() => {
    let first: string | null | undefined;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const { state } = (await (await fetch("/api/live/stock?poll=1")).json()) as { state: string | null };
        if (first === undefined) first = state;
        else if (state && state !== first) {
          first = state;
          router.refresh();
        }
      } catch {
        // offline for a moment: next time
      }
    };
    const onVisibility = () => document.visibilityState === "visible" && void check();
    void check();
    const timer = window.setInterval(check, EVERY);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router]);
  return null;
}
