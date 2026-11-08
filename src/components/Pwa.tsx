"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DUR, EASE } from "@/lib/motion";

/*
 * The site as an app (PWA): registers the service worker (public/sw.js), and offers to install ArtSyde
 * on the phone — Android/Chrome with the browser's own prompt, iPhone with the "Partager › Sur l'écran
 * d'accueil" steps (Safari has no prompt). Shown once a visitor has looked around a little, never
 * inside the installed app, and not again for 30 days after "Plus tard".
 */

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const LATER_KEY = "artsyde:pwa-later";
const LATER_DAYS = 30;

function dismissedRecently() {
  try {
    const at = Number(localStorage.getItem(LATER_KEY));
    return Boolean(at) && Date.now() - at < LATER_DAYS * 864e5;
  } catch {
    return false;
  }
}

function standalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function Pwa() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [ios, setIos] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Development: no service worker, so a stale cache never hides a change.
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    }
    if (standalone() || dismissedRecently()) return;

    let timer: number | undefined;
    const showSoon = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setOpen(true), 20_000); // after a little browsing, not on arrival
    };
    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep the browser's own bar quiet: our banner asks instead
      setPrompt(e as InstallPrompt);
      showSoon();
    };
    const onInstalled = () => {
      setOpen(false);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // iPhone / iPad in Safari: no install prompt exists, the steps are shown instead.
    const ua = navigator.userAgent;
    const iOS = /iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
    if (iOS && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua)) {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setIos(true);
        setOpen(true);
      }, 20_000);
    }
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const later = () => {
    setOpen(false);
    try {
      localStorage.setItem(LATER_KEY, String(Date.now()));
    } catch {}
  };
  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice.catch(() => ({ outcome: "dismissed" as const }));
    setPrompt(null);
    if (outcome === "accepted") setOpen(false);
    else later();
  };

  return (
    <AnimatePresence>
      {open && (prompt || ios) && (
        <motion.div
          role="dialog"
          aria-label="Installer l'application ArtSyde"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: DUR.base, ease: EASE.out }}
          className="fixed inset-x-3 bottom-3 z-[70] mx-auto flex max-w-md items-start gap-4 rounded-[22px] border border-line bg-surface/95 p-4 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:bottom-5"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- the app icon, a static file */}
          <img src="/icons/icon-192.png" alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Installer ArtSyde</p>
            {ios ? (
              <p className="mt-1 text-sm text-muted">
                Touche <span className="text-ink">Partager</span> <span aria-hidden>⎋</span> en bas de Safari, puis <span className="text-ink">Sur l&apos;écran d&apos;accueil</span>.
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted">L&apos;app sur ton écran d&apos;accueil : la boutique et le studio en un geste.</p>
            )}
            <div className="mt-3 flex items-center gap-5 text-sm">
              {!ios && (
                <button type="button" onClick={install} className="btn !px-5 !py-2">
                  Installer
                </button>
              )}
              <button type="button" onClick={later} className="text-muted hover:text-ink">
                {ios ? "Compris" : "Plus tard"}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
