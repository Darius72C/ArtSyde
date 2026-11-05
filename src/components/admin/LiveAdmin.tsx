"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLive } from "@/lib/use-live";
import { DUR, EASE, SPRING } from "@/lib/motion";

type Live = { action: string; message: string; at: string; reference?: string };
type Toast = Live & { key: number; kind: "alert" | "error" };

const noop = () => () => {};

/** A short two-note chime (Web Audio): no sound file to load. */
function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.type = "sine";
      const t = ctx.currentTime + i * 0.14;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.4);
    });
    setTimeout(() => ctx.close(), 1000);
  } catch {}
}

const hrefFor = (l: Live) => (l.action === "order.placed" && l.reference ? `/admin/commandes/${encodeURIComponent(l.reference)}` : l.action === "credits.requested" ? "/admin/credits" : "/admin/journal?type=erreurs");

/**
 * The admin, live: refreshes the page's data on any activity, and for a new order or credit purchase (or a
 * server error) shows a card, plays a chime and, if allowed, a system notification.
 */
export function LiveAdmin() {
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);
  // The browser's notification permission ("unsupported" on the server and where there are none).
  const [, recheck] = useState(0);
  const canNotify = useSyncExternalStore(
    noop,
    () => (typeof Notification === "undefined" ? "unsupported" : Notification.permission),
    () => "unsupported",
  );
  const seq = useRef(0);
  const refresh = useRef<number | undefined>(undefined);

  useLive("/api/live/admin", ["alert", "activity", "error"], (event, data) => {
    const l = data as Live;
    window.clearTimeout(refresh.current);
    refresh.current = window.setTimeout(() => router.refresh(), 500);
    if (event === "activity") return;
    const key = ++seq.current;
    setToasts((t) => [...t.slice(-3), { ...l, key, kind: event === "error" ? "error" : "alert" }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.key !== key)), 12_000);
    if (event === "alert") {
      chime();
      if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.visibilityState !== "visible") {
        new Notification("ArtSyde", { body: l.message, tag: l.reference ?? l.at });
      }
    }
  });

  return (
    <>
      {canNotify === "default" && (
        <button
          type="button"
          onClick={() => Notification.requestPermission().then(() => recheck((n) => n + 1))}
          className="fixed bottom-5 left-5 z-50 rounded-full border border-line bg-bg px-4 py-2 text-[13px] text-link shadow-[0_6px_20px_-8px_rgba(0,0,0,0.3)] hover:underline"
        >
          Activer les notifications des commandes
        </button>
      )}
      <div className="pointer-events-none fixed right-4 top-20 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-3" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.key}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, transition: { duration: DUR.fast, ease: EASE.in } }}
              transition={SPRING.snappy}
              className="pointer-events-auto rounded-2xl border border-line/60 bg-[var(--nav)] p-4 shadow-[0_10px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl"
            >
              <p className={`text-[12px] font-semibold ${t.kind === "error" ? "text-danger" : "text-ok"}`}>{t.kind === "error" ? "Erreur sur le site" : t.action === "order.placed" ? "Nouvelle commande" : "Achat de crédits"}</p>
              <p className="mt-1 text-[15px] leading-snug">{t.message}</p>
              <div className="mt-2 flex items-center justify-between gap-4">
                <Link href={hrefFor(t)} className="text-[14px] text-link hover:underline">
                  Voir ›
                </Link>
                <button type="button" onClick={() => setToasts((x) => x.filter((y) => y.key !== t.key))} className="text-[13px] text-muted hover:text-ink">
                  Fermer
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
