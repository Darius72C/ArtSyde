"use client";

import { useState, useTransition } from "react";
import { createPromo, type PromoInput, type PromoSaveResult } from "@/server/admin/promos";
import { Field } from "../pages/CheckoutView";

const EMPTY: PromoInput = { code: "", kind: "percent", value: "", minSubtotal: "", maxUses: "", onePerCustomer: false, endsAt: "", note: "" };

/** A new promo code: the code, the discount (percentage or amount), and its optional limits. */
export function PromoForm() {
  const [v, setV] = useState<PromoInput>(EMPTY);
  const [r, setR] = useState<PromoSaveResult | null>(null);
  const [pending, start] = useTransition();
  const set = (patch: Partial<PromoInput>) => (setV((x) => ({ ...x, ...patch })), setR(null));
  const err = (f: keyof PromoInput) => (r && !r.ok && r.field === f ? r.message : undefined);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await createPromo(v).catch(() => ({ ok: false as const, message: "Connexion perdue. Réessaie." }));
          setR(res);
          if (res.ok) setV(EMPTY);
        });
      }}
      className="space-y-8"
    >
      <div className="grid gap-8 sm:grid-cols-3">
        <Field name="code" label="Code" value={v.code} onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/\s+/g, "") })} placeholder="ARTSYDE20" maxLength={30} autoComplete="off" spellCheck={false} error={err("code")} />
        <fieldset>
          <legend className="mb-1.5 text-[14px] text-muted">Remise</legend>
          <div className="flex w-fit rounded-full bg-surface p-1" role="radiogroup" aria-label="Type de remise">
            {(["percent", "amount"] as const).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={v.kind === k} onClick={() => set({ kind: k })} className={`rounded-full px-4 py-1.5 text-[14px] ${v.kind === k ? "bg-bg font-medium shadow-[0_1px_4px_rgba(0,0,0,0.12)]" : "text-muted"}`}>
                {k === "percent" ? "Pourcentage" : "Montant"}
              </button>
            ))}
          </div>
        </fieldset>
        <Field name="value" label={v.kind === "percent" ? "Pourcentage (1 à 90)" : "Montant (FCFA)"} inputMode="numeric" value={v.value} onChange={(e) => set({ value: e.target.value })} placeholder={v.kind === "percent" ? "20" : "2000"} error={err("value")} />
      </div>

      <div className="grid gap-8 sm:grid-cols-3">
        <Field name="minSubtotal" label="Articles à partir de (FCFA, facultatif)" inputMode="numeric" value={v.minSubtotal} onChange={(e) => set({ minSubtotal: e.target.value })} placeholder="Aucun minimum" error={err("minSubtotal")} />
        <Field name="maxUses" label="Nombre de commandes (facultatif)" inputMode="numeric" value={v.maxUses} onChange={(e) => set({ maxUses: e.target.value })} placeholder="Illimité" error={err("maxUses")} />
        <Field name="endsAt" type="date" label="Dernier jour (facultatif)" value={v.endsAt} onChange={(e) => set({ endsAt: e.target.value })} error={err("endsAt")} />
      </div>

      <div className="grid gap-8 sm:grid-cols-[2fr_1fr] sm:items-end">
        <Field name="note" label="Note pour toi (facultatif)" value={v.note} onChange={(e) => set({ note: e.target.value })} placeholder="Newsletter de novembre" maxLength={120} />
        <label className="flex cursor-pointer items-center gap-3 pb-3 text-[15px]">
          <input type="checkbox" checked={v.onePerCustomer} onChange={(e) => set({ onePerCustomer: e.target.checked })} className="h-5 w-5 accent-[var(--accent)]" />
          Une fois par client
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-6 border-t border-line pt-8">
        <button disabled={pending} className="btn">
          {pending ? <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-label="Enregistrement" /> : "Créer le code"}
        </button>
        {r && (r.ok || !r.field) && (
          <p role="status" className={`text-sm ${r.ok ? "text-ok" : "text-danger"}`}>
            {r.ok ? "Code créé : il marche dès maintenant au paiement." : r.message}
          </p>
        )}
      </div>
    </form>
  );
}
