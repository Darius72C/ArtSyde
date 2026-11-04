"use client";

import Link from "next/link";
import { motion } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

export function ErrorScreen({ code, title, text, onRetry }: { code: string; title: string; text: string; onRetry?: () => void }) {
  return (
    <div className="mx-auto flex min-h-[70svh] max-w-[1440px] flex-col justify-center px-5 py-20 md:px-10">
      <p className="eyebrow">Erreur {code}</p>
      <h1 className="display mt-6 text-[clamp(6rem,22vw,18rem)] leading-[0.85]">
        {code.split("").map((d, i) => (
          <span key={i} className="inline-block overflow-hidden align-bottom">
            <motion.span className="inline-block" initial={{ y: "100%" }} animate={{ y: 0 }} transition={{ duration: 1.4, ease: EASE, delay: 0.1 + i * 0.1 }}>
              {d}
            </motion.span>
          </span>
        ))}
      </h1>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, ease: EASE, delay: 0.6 }} className="mt-10 grid gap-8 border-t border-line pt-10 md:grid-cols-2">
        <h2 className="display text-4xl md:text-5xl">{title}</h2>
        <div>
          <p className="max-w-md leading-relaxed text-muted">{text}</p>
          <div className="mt-8 flex flex-wrap items-center gap-8">
            {onRetry && (
              <button onClick={onRetry} className="btn">
                Réessayer
              </button>
            )}
            <Link href="/" className={onRetry ? "link-line" : "btn"}>
              Retour à l&apos;accueil {onRetry && <span className="arrow">→</span>}
            </Link>
            {!onRetry && (
              <Link href="/#boutique" className="link-line">
                La boutique <span className="arrow">→</span>
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
