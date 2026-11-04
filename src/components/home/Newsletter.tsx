"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { RevealLines } from "../Reveal";

export function Newsletter() {
  const [done, setDone] = useState(false);
  return (
    <section className="px-5 py-20 text-center md:py-28">
      <RevealLines lines={["Ne rate aucun drop."]} className="display text-[clamp(2rem,4.5vw,3.25rem)]" />
      <motion.p initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.15 }} className="lead mx-auto mt-3 max-w-md">Nouveautés et éditions limitées, en avant-première dans ta boîte mail.</motion.p>
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div key="ok" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="mt-8 flex flex-col items-center gap-3">
            <motion.svg viewBox="0 0 52 52" className="h-14 w-14 text-ok" initial={{ scale: 0.6, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 14 }}>
              <motion.circle cx="26" cy="26" r="24" fill="none" stroke="currentColor" strokeWidth="2.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, ease: "easeOut" }} />
              <motion.path d="M15 27l7 7 15-16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.45, ease: "easeOut" }} />
            </motion.svg>
            <p className="text-[17px]">C&apos;est noté, à très vite.</p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            exit={{ opacity: 0, scale: 0.96, filter: "blur(4px)" }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            onSubmit={(e) => {
              e.preventDefault();
              setDone(true); // TODO: send to the newsletter service
            }}
            className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <label className="flex-1">
              <span className="sr-only">Ton e-mail</span>
              <input id="newsletter-email" type="email" required placeholder="Ton adresse e-mail" className="field" />
            </label>
            <button className="btn shrink-0">S&apos;inscrire</button>
          </motion.form>
        )}
      </AnimatePresence>
    </section>
  );
}
