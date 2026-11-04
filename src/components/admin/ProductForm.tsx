"use client";

import { useActionState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Field } from "../pages/CheckoutView";
import { TEE_COLORS } from "@/lib/data";
import { DUR, EASE } from "@/lib/motion";
import { saveProduct, type ProductFormState } from "@/lib/admin/products";

export type EditableProduct = { id: string; name: string; priceXof: number; oldPriceXof: number | null; tag: string | null; colors: string[]; sizes: string[]; active: boolean };

const TAGS = [
  { value: "", label: "Aucune" },
  { value: "NOUVEAU", label: "Nouveau" },
  { value: "BEST_SELLER", label: "Best-seller" },
  { value: "PROMO", label: "Promo" },
];
const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

function FieldError({ children }: { children?: string }) {
  return (
    <AnimatePresence>
      {children && (
        <motion.span initial={{ opacity: 0, y: -6, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -6, height: 0 }} transition={{ duration: DUR.fast, ease: EASE.out }} className="mt-2 block overflow-hidden text-sm text-danger">
          {children}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/** Name, prices, label, colours, sizes and visibility of one product. Empty `product.id` creates one. */
export function ProductForm({ product }: { product: EditableProduct }) {
  const [state, action, pending] = useActionState<ProductFormState, FormData>(saveProduct, {});
  const e = state.errors ?? {};
  const isNew = !product.id;

  return (
    <form action={action} noValidate className="space-y-8">
      <input type="hidden" name="id" value={product.id} />
      <Field name="name" label="Nom du modèle" defaultValue={product.name} error={e.name} maxLength={80} />
      <div className="grid gap-8 sm:grid-cols-2">
        <Field name="price" label="Prix (FCFA)" inputMode="numeric" defaultValue={product.priceXof || ""} error={e.price} />
        <Field name="oldPrice" label="Prix barré (FCFA, facultatif)" inputMode="numeric" defaultValue={product.oldPriceXof ?? ""} error={e.oldPrice} />
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[14px] text-muted">Étiquette</span>
        <select name="tag" defaultValue={product.tag ?? ""} className="field">
          {TAGS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="mb-3 text-[14px] text-muted">Couleurs proposées</legend>
        <div className="flex flex-wrap gap-2">
          {TEE_COLORS.map((c) => (
            <label key={c.hex} className="cursor-pointer">
              <input type="checkbox" name="colors" value={c.hex} defaultChecked={product.colors.some((x) => x.toLowerCase() === c.hex.toLowerCase())} className="peer sr-only" />
              <span className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[14px] text-muted transition-colors duration-300 peer-checked:border-ink peer-checked:bg-bg peer-checked:font-medium peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent">
                <span className="h-3 w-3 rounded-full ring-1 ring-line" style={{ background: c.hex }} />
                {c.name}
              </span>
            </label>
          ))}
        </div>
        <FieldError>{e.colors}</FieldError>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-[14px] text-muted">Tailles</legend>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((s) => (
            <label key={s} className="cursor-pointer">
              <input type="checkbox" name="sizes" value={s} defaultChecked={product.sizes.includes(s)} className="peer sr-only" />
              <span className="block min-w-12 rounded-full border border-line px-3 py-1.5 text-center text-[14px] text-muted transition-colors duration-300 peer-checked:border-ink peer-checked:bg-bg peer-checked:font-medium peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-accent">{s}</span>
            </label>
          ))}
        </div>
        <FieldError>{e.sizes}</FieldError>
      </fieldset>

      <label className="flex cursor-pointer items-center gap-3 text-[15px]">
        <input type="checkbox" name="active" defaultChecked={product.active} className="h-5 w-5 accent-[var(--accent)]" />
        En ligne dans la boutique
      </label>

      <div className="flex flex-wrap items-center gap-6 border-t border-line pt-8">
        <button disabled={pending} className="btn">
          {pending ? <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-label="Enregistrement" /> : isNew ? "Créer le modèle" : "Enregistrer"}
        </button>
        <AnimatePresence>
          {(state.saved || state.message) && !pending && (
            <motion.p key={state.message ?? "ok"} role="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: DUR.fast, ease: EASE.out }} className={`text-sm ${state.message ? "text-danger" : "text-ok"}`}>
              {state.message ?? "Enregistré. La boutique est à jour."}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </form>
  );
}
