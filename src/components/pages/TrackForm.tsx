"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DUR, EASE } from "@/lib/motion";
import { findOrder } from "@/server/track-order";
import { Field } from "./CheckoutView";

/** Reference + phone → the order's tracking page. */
export function TrackForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setMessage(undefined);
    startTransition(async () => {
      const r = await findOrder(String(f.get("reference") ?? ""), String(f.get("phone") ?? "")).catch(() => null);
      if (!r) return setMessage("Connexion perdue. Vérifie ton réseau et réessaie.");
      if (!r.ok) return setMessage(r.message);
      router.push(r.href);
    });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-8">
      <div className="grid gap-8 sm:grid-cols-2">
        <Field name="reference" label="Référence de commande" placeholder="AS-2611-0143" autoComplete="off" />
        <Field name="phone" label="Téléphone donné à la commande" type="tel" autoComplete="tel" />
      </div>
      <AnimatePresence>
        {message && (
          <motion.p role="alert" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: DUR.fast, ease: EASE.out }} className="text-sm text-danger">
            {message}
          </motion.p>
        )}
      </AnimatePresence>
      <button disabled={pending} className="btn">
        {pending ? <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-label="Recherche" /> : "Voir ma commande"}
      </button>
    </form>
  );
}
