"use client";

import { useActionState, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Field } from "../pages/CheckoutView";
import { DUR, EASE } from "@/lib/motion";
import { adjustCredits, type AdjustCreditsState } from "@/server/admin/credits";

/** Gift or take back studio credits (/admin/clients). `phone` prefills the form from a customer's row. */
export function CreditAdjust({ phone }: { phone?: string }) {
  const [state, action, pending] = useActionState<AdjustCreditsState, FormData>(adjustCredits, {});
  const [direction, setDirection] = useState<"add" | "remove">("add");
  const e = state.errors ?? {};

  return (
    <form action={action} noValidate className="space-y-8">
      <div className="flex rounded-full bg-surface p-1 sm:w-fit" role="radiogroup" aria-label="Opération">
        {(["add", "remove"] as const).map((d) => (
          <button key={d} type="button" role="radio" aria-checked={direction === d} onClick={() => setDirection(d)} className={`flex-1 rounded-full px-4 py-1.5 text-[14px] transition-colors sm:flex-none ${direction === d ? "bg-bg font-medium shadow-[0_1px_4px_rgba(0,0,0,0.12)]" : "text-muted"}`}>
            {d === "add" ? "Offrir" : "Retirer"}
          </button>
        ))}
      </div>
      <input type="hidden" name="direction" value={direction} />

      <div className="grid gap-8 sm:grid-cols-3">
        <Field key={phone ?? "none"} name="phone" label="Téléphone ou e-mail du client" defaultValue={phone} error={e.phone} />
        <Field name="name" label="Nom (si nouveau client)" error={e.name} maxLength={120} disabled={direction === "remove"} />
        <Field name="amount" label="Nombre de crédits" inputMode="numeric" error={e.amount} />
      </div>

      {direction === "add" && (
        <label className="block sm:w-80">
          <span className="mb-1.5 block text-[14px] text-muted">Motif</span>
          <select name="reason" defaultValue="ADJUSTMENT" className="field">
            <option value="ADJUSTMENT">Cadeau ou geste commercial</option>
            <option value="REFUND">Rendre des crédits utilisés</option>
          </select>
        </label>
      )}

      <div className="flex flex-wrap items-center gap-6 border-t border-line pt-8">
        <button disabled={pending} className="btn">
          {pending ? <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-label="Enregistrement" /> : direction === "add" ? "Offrir les crédits" : "Retirer les crédits"}
        </button>
        <AnimatePresence>
          {(state.done || state.message) && !pending && (
            <motion.p key={state.done ?? state.message} role="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: DUR.fast, ease: EASE.out }} className={`text-sm ${state.message ? "text-danger" : "text-ok"}`}>
              {state.done ?? state.message}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}
