"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DUR, EASE } from "@/lib/motion";
import { deleteProduct } from "@/server/admin/products";

/** "Supprimer le modèle", asked twice. A product already ordered is refused, with how to hide it instead. */
export function DeleteProduct({ productId, name }: { productId: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      setError(null);
      const r = await deleteProduct(productId); // on success it redirects to the list
      if (r && !r.ok) {
        setError(r.message);
        setConfirming(false);
      }
    });

  return (
    <div className="border-t border-line pt-8">
      <AnimatePresence mode="wait" initial={false}>
        {confirming ? (
          <motion.div key="confirm" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: DUR.fast, ease: EASE.out }} className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <p className="text-[15px]">
              Supprimer <b className="font-semibold">{name}</b> et ses photos ? C&apos;est définitif.
            </p>
            <div className="flex items-center gap-6">
              <button type="button" disabled={pending} onClick={remove} className="btn !bg-danger">
                {pending ? <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-label="Suppression" /> : "Oui, supprimer"}
              </button>
              <button type="button" disabled={pending} onClick={() => setConfirming(false)} className="text-[15px] text-link hover:underline">
                Annuler
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button key="ask" type="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: DUR.fast, ease: EASE.out }} onClick={() => setConfirming(true)} className="text-[15px] text-danger hover:underline">
            Supprimer le modèle
          </motion.button>
        )}
      </AnimatePresence>
      {error && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
