"use client";

import { useState } from "react";
import { subscribeNewsletter } from "@/server/newsletter";
import { AnimatePresence, motion } from "motion/react";
import { RevealLines } from "../Reveal";
import { DUR, EASE, SPRING, VIEWPORT } from "@/lib/motion";

export function Newsletter() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <section className="px-5 py-20 text-center md:py-28">
      <RevealLines lines={["Ne rate aucun drop."]} className="display text-[clamp(2rem,4.5vw,3.25rem)]" />
      <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={VIEWPORT} transition={{ duration: DUR.slow, ease: EASE.out, delay: 0.15 }} className="lead mx-auto mt-3 max-w-md">Nouveautés et éditions limitées, en avant-première dans ta boîte mail.</motion.p>
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div key="ok" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DUR.base, ease: EASE.out }} className="mt-8 flex flex-col items-center gap-3">
            <motion.svg viewBox="0 0 52 52" className="h-14 w-14 text-ok" initial={{ scale: 0.6, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={SPRING.bouncy}>
              <motion.circle cx="26" cy="26" r="24" fill="none" stroke="currentColor" strokeWidth="2.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: DUR.base, ease: EASE.out }} />
              <motion.path d="M15 27l7 7 15-16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: DUR.fast, delay: 0.45, ease: EASE.out }} />
            </motion.svg>
            <p className="text-[17px]">C&apos;est noté, à très vite.</p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            exit={{ opacity: 0, scale: 0.96, filter: "blur(4px)" }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: DUR.slow, ease: EASE.out }}
            onSubmit={async (e) => {
              e.preventDefault();
              const email = String(new FormData(e.currentTarget).get("email") ?? "");
              setPending(true);
              setError("");
              const r = await subscribeNewsletter(email).catch(() => ({ ok: false as const, message: "Connexion perdue. Réessaie." }));
              setPending(false);
              if (r.ok) setDone(true);
              else setError(r.message);
            }}
            className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row sm:flex-wrap"
          >
            <label className="flex-1">
              <span className="sr-only">Ton e-mail</span>
              <input id="newsletter-email" name="email" type="email" required placeholder="Ton adresse e-mail" aria-invalid={error ? true : undefined} aria-describedby={error ? "newsletter-error" : undefined} className="field" />
            </label>
            <button disabled={pending} className="btn shrink-0">
              {pending ? <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-label="Inscription" /> : "S'inscrire"}
            </button>
            {error && (
              <p id="newsletter-error" role="alert" className="text-sm text-danger sm:basis-full">
                {error}
              </p>
            )}
          </motion.form>
        )}
      </AnimatePresence>
    </section>
  );
}
