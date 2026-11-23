"use client";

import Link from "@/components/LocaleLink";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { track } from "@/lib/metrics";
import { AnimatePresence, motion } from "motion/react";
import { cart, cartSubtotal, useCart } from "@/lib/cart";
import { DELIVERY, DELIVERY_METHODS, checkFields, orderHref, type CheckoutFields } from "@/lib/orders";
import { placeOrder } from "@/server/place-order";
import { checkPromo } from "@/server/promo";
import type { PromoCheck } from "@/lib/promos";
import { PAYMENT_METHODS, PAYMENT_METHOD_IDS, type PaymentMethodId } from "@/lib/credits";
import { paymentFee } from "@/lib/payment-fees";
import type { DeliveryMethod } from "@/generated/prisma/client";
import { formatFCFA } from "@/lib/products";
import { Thumb } from "./CartView";
import { RevealLines } from "../Reveal";
import { DUR, EASE } from "@/lib/motion";
import { useHref, useT } from "../I18nProvider";

/** Labelled input with an error under it that shakes in. Also used by the credits page. */
export function Field({ name, label, error, ...rest }: { name: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const t = useT();
  return (
    <label className="block">
      <span className="mb-1.5 block text-[14px] text-muted">{label}</span>
      {/* Shakes when an error appears. */}
      <motion.div animate={error ? { x: [0, -8, 7, -5, 3, 0] } : { x: 0 }} transition={{ duration: DUR.fast, ease: EASE.out }}>
        <input name={name} className={`field ${error ? "!border-danger" : ""}`} {...rest} />
      </motion.div>
      <AnimatePresence>
        {error && (
          <motion.span initial={{ opacity: 0, y: -6, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -6, height: 0 }} className="mt-2 block overflow-hidden text-sm text-danger">
            {t(error)}
          </motion.span>
        )}
      </AnimatePresence>
    </label>
  );
}

function Steps({ current }: { current: number }) {
  const t = useT();
  return (
    <ol className="flex items-center gap-3 text-[14px]">
      {["Panier", "Livraison", "Confirmation"].map((s, i) => (
        <li key={s} className={`flex items-center gap-3 ${i === current ? "text-ink" : "text-muted"}`}>
          <span className={`grid h-6 w-6 place-items-center rounded-full text-[12px] font-semibold ${i < current ? "bg-ok text-white" : i === current ? "bg-accent text-white" : "bg-surface"}`}>{i < current ? "✓" : i + 1}</span>
          <span className={i === current ? "font-medium" : ""}>{t(s)}</span>
          {i < 2 && <span className="hidden h-px w-10 bg-line sm:block" />}
        </li>
      ))}
    </ol>
  );
}

/** `online`: GeniusPay is set up: the customer pays right after ordering, on its page. */
export function CheckoutView({ online = false }: { online?: boolean }) {
  const t = useT();
  const href = useHref();
  const items = useCart();
  useEffect(() => track("checkout.open"), []);
  const [method, setMethod] = useState<PaymentMethodId>("WAVE");
  const router = useRouter();
  const [delivery, setDelivery] = useState<DeliveryMethod>("STANDARD");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();
  // Stays true once the order is placed, so the emptied cart does not flash "Rien à commander".
  const [placed, setPlaced] = useState(false);
  const sending = pending || placed;
  const subtotal = cartSubtotal(items);
  const shipping = DELIVERY[delivery].price;
  // A promo code: tried with "Appliquer" (an estimate on screen), checked again when the order is placed.
  const [code, setCode] = useState("");
  const [promo, setPromo] = useState<Extract<PromoCheck, { ok: true }> | null>(null);
  const [promoError, setPromoError] = useState<string>();
  const [checking, startChecking] = useTransition();
  const discount = promo?.discount ?? 0;
  const total = subtotal - discount + shipping;
  // Online, the customer pays the operator's fee: it changes with the operator chosen.
  const fee = online ? paymentFee(total, method) : 0;
  const toPay = total + fee;

  function applyPromo() {
    if (!code.trim()) return setPromoError(t("Entre ton code."));
    startChecking(async () => {
      const r = await checkPromo(code, subtotal).catch(() => ({ ok: false as const, message: t("Connexion perdue. Réessaie.") }));
      if (r.ok) {
        setPromo(r);
        setPromoError(undefined);
      } else {
        setPromo(null);
        setPromoError(r.message);
      }
    });
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string | undefined>;
    const fields: CheckoutFields = { name: f.name ?? "", phone: f.phone ?? "", email: f.email ?? "", city: f.city ?? "", address: f.address ?? "", notes: f.notes ?? "" };
    const err = checkFields(fields, delivery);
    setErrors(err);
    setMessage(undefined);
    if (Object.keys(err).length) return;
    const lines = items.map(({ productId, color, size, qty, price, preview, quality, files }) => ({ productId, color, size, qty, price, preview, quality, files }));
    startTransition(async () => {
      const r = await placeOrder({ fields, delivery, lines, ...(online ? { method } : {}), ...(promo ? { promo: promo.code } : {}) }).catch(() => null);
      if (!r) return setMessage(t("Connexion perdue. Vérifie ton réseau et réessaie."));
      if (!r.ok) {
        setErrors(r.errors);
        setMessage(r.message);
        // The code no longer works (used up, expired…): taken off, the customer sees why and can order without it.
        if (r.promoError) {
          setPromo(null);
          setPromoError(r.promoError);
        }
        return;
      }
      setPlaced(true);
      cart.clear();
      // Online payment: off to GeniusPay's page (it brings the customer back to the order's tracking).
      if (r.payUrl) return window.location.assign(r.payUrl);
      router.push(href(`${orderHref(r.reference, r.key)}${r.payError ? "&paiement=indisponible" : ""}`));
    });
  }

  if (items.length === 0 && !sending) {
    return (
      <div className="mx-auto max-w-[1440px] px-5 py-28 md:px-10">
        <p className="display text-5xl">{t("Rien à commander pour l'instant.")}</p>
        <Link href="/#boutique" className="btn mt-10">{t("La boutique")}</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] px-5 md:px-10">
      <div className="pb-10 pt-14 md:pt-20">
        <Steps current={1} />
        <RevealLines as="h1" lines={[t("Finaliser ma commande.")]} className="display mt-8 text-5xl md:text-7xl" />
      </div>

      <form onSubmit={submit} noValidate className="grid items-start gap-14 pb-24 lg:grid-cols-[1fr_400px] lg:gap-20">
        <div className="space-y-16">
          <section>
            <p className="border-b border-line pb-4 text-[24px] font-semibold tracking-[-0.02em]">{t("Tes coordonnées")}</p>
            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              <Field error={errors.name} name="name" label={t("Nom complet")} autoComplete="name" />
              <Field error={errors.phone} name="phone" label={t("Téléphone")} type="tel" autoComplete="tel" />
              <div className="sm:col-span-2">
                <Field error={errors.email} name="email" label={t("E-mail (facultatif)")} type="email" autoComplete="email" placeholder={t("Pour recevoir la confirmation")} />
              </div>
            </div>
          </section>

          <section>
            <p className="border-b border-line pb-4 text-[24px] font-semibold tracking-[-0.02em]">{t("Livraison")}</p>
            <div className="mt-6" role="radiogroup">
              {DELIVERY_METHODS.map((k) => {
                const d = DELIVERY[k];
                const on = delivery === k;
                return (
                  <button type="button" role="radio" aria-checked={on} key={k} onClick={() => setDelivery(k)} className={`mb-3 flex w-full items-center gap-5 rounded-2xl border px-5 py-4 text-left transition-colors ${on ? "border-accent shadow-[0_0_0_1px_var(--accent)]" : "border-line hover:border-muted"}`}>
                    <span className={`grid h-5 w-5 place-items-center rounded-full border transition ${on ? "border-accent" : "border-line"}`}>
                      {on && <motion.span layoutId="ship-dot" className="h-2.5 w-2.5 rounded-full bg-accent" />}
                    </span>
                    <span className="flex-1">
                      <span className="block text-[17px] font-semibold">{t(d.label)}</span>
                      <span className="text-sm text-muted">{t(d.note)}</span>
                    </span>
                    <span className="text-sm">{d.price ? formatFCFA(d.price) : t("Offert")}</span>
                  </button>
                );
              })}
            </div>
            <AnimatePresence initial={false}>
              {delivery !== "RETRAIT" && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: DUR.base, ease: EASE.out }} className="overflow-hidden">
                  <div className="grid gap-8 pt-8 sm:grid-cols-2">
                    <Field error={errors.city} name="city" label={t("Ville ou commune")} autoComplete="address-level2" />
                    <Field error={errors.address} name="address" label={t("Adresse ou repère")} autoComplete="street-address" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <label className="mt-8 block">
              <span className="mb-1.5 block text-[14px] text-muted">{t("Note (facultatif)")}</span>
              <textarea name="notes" rows={2} className="field resize-none" />
            </label>
          </section>

          <section>
            <p className="border-b border-line pb-4 text-[24px] font-semibold tracking-[-0.02em]">{t("Paiement")}</p>
            {online ? (
              <>
                <div className="mt-6" role="radiogroup" aria-label={t("Moyen de paiement")}>
                  {PAYMENT_METHOD_IDS.map((k) => {
                    const on = method === k;
                    return (
                      <button type="button" role="radio" aria-checked={on} key={k} onClick={() => setMethod(k)} className={`mb-3 flex w-full items-center gap-5 rounded-2xl border px-5 py-4 text-left transition-colors ${on ? "border-accent shadow-[0_0_0_1px_var(--accent)]" : "border-line hover:border-muted"}`}>
                        <span className={`grid h-5 w-5 place-items-center rounded-full border transition ${on ? "border-accent" : "border-line"}`}>
                          {on && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
                        </span>
                        <span className="flex-1">
                          <span className="block text-[17px] font-semibold">{t(PAYMENT_METHODS[k])}</span>
                          <span className="text-sm tabular-nums text-muted">{t("Frais {fee}", { fee: formatFCFA(paymentFee(total, k)) })}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 max-w-lg text-sm text-muted">{t("Tu paies sur la page sécurisée de GeniusPay, puis tu reviens au suivi de ta commande.")}</p>
              </>
            ) : (
              <>
                <p className="mt-6 text-[21px] font-semibold">{t("Paiement en ligne bientôt disponible.")}</p>
                <p className="mt-2 max-w-lg text-sm text-muted">{t("Ta commande est enregistrée et on te contacte pour le règlement.")}</p>
              </>
            )}
          </section>
        </div>

        <aside className="tile p-8 lg:sticky lg:top-20">
          <p className="text-[21px] font-semibold">{t("Ta commande")}</p>
          <ul className="mt-6 max-h-72 space-y-5 overflow-auto">
            {items.map((it) => (
              <li key={it.key} className="flex items-center gap-4">
                <Thumb item={it} className="aspect-[4/5] w-14" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{it.name}</p>
                  <p className="text-xs text-muted">{t("Taille {size}", { size: it.size })} · × {it.qty}</p>
                </div>
                <p className="text-sm tabular-nums">{formatFCFA(it.price * it.qty)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-6 space-y-3 border-t border-line pt-6 text-sm">
            <div className="flex justify-between"><dt className="text-muted">{t("Sous-total")}</dt><dd className="tabular-nums">{formatFCFA(subtotal)}</dd></div>
            {promo && (
              <div className="flex justify-between">
                <dt className="text-muted">
                  {t("Code {code} ({label})", { code: promo.code, label: promo.label })}
                </dt>
                <dd className="tabular-nums text-ok">-{formatFCFA(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between"><dt className="text-muted">{t(DELIVERY[delivery].label)}</dt><dd className="tabular-nums">{shipping ? formatFCFA(shipping) : t("Offert")}</dd></div>
            {fee > 0 && <div className="flex justify-between"><dt className="text-muted">{t("Frais {method}", { method: t(PAYMENT_METHODS[method]) })}</dt><dd className="tabular-nums">{formatFCFA(fee)}</dd></div>}
          </dl>

          {/* Promo code: a button, not a form (this whole page is the order's form). */}
          <div className="mt-6 border-t border-line pt-6">
            {promo ? (
              <p className="flex items-center justify-between gap-4 text-sm">
                <span className="text-ok">{t("Code {code} appliqué.", { code: promo.code })}</span>
                <button type="button" onClick={() => (setPromo(null), setCode(""))} className="text-link hover:underline">
                  {t("Retirer")}
                </button>
              </p>
            ) : (
              <>
                <label htmlFor="promo" className="mb-1.5 block text-[14px] text-muted">
                  {t("Code promo")}
                </label>
                <div className="flex gap-2">
                  <input
                    id="promo"
                    value={code}
                    onChange={(e) => (setCode(e.target.value.toUpperCase()), setPromoError(undefined))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyPromo();
                      }
                    }}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={30}
                    placeholder="ARTSYDE20"
                    aria-invalid={promoError ? true : undefined}
                    aria-describedby={promoError ? "promo-error" : undefined}
                    className={`field min-w-0 flex-1 uppercase ${promoError ? "!border-danger" : ""}`}
                  />
                  <button type="button" onClick={applyPromo} disabled={checking} className="btn-outline shrink-0">
                    {checking ? <span className="h-4 w-4 animate-spin rounded-full border border-current border-t-transparent" aria-label={t("Vérification")} /> : t("Appliquer")}
                  </button>
                </div>
                {promoError && (
                  <p id="promo-error" role="alert" className="mt-2 text-sm text-danger">
                    {t(promoError)}
                  </p>
                )}
              </>
            )}
          </div>
          <div className="mt-6 flex items-baseline justify-between border-t border-line pt-6">
            <span className="font-semibold">{t("Total")}</span>
            <motion.span key={toPay} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="display text-3xl tabular-nums">{formatFCFA(toPay)}</motion.span>
          </div>
          <AnimatePresence>
            {message && (
              <motion.p role="alert" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: DUR.fast, ease: EASE.out }} className="mt-6 text-sm text-danger">
                {t(message)}
              </motion.p>
            )}
          </AnimatePresence>
          <button disabled={sending} className="btn mt-8 w-full">
            {sending ? <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-label={t("Envoi")} /> : online ? t("Payer {amount}", { amount: formatFCFA(toPay) }) : t("Valider la commande")}
          </button>
          <p className="mt-4 text-center text-xs text-muted">
            {t("En validant, tu acceptes nos")}{" "}
            <Link href="/conditions-de-vente" className="underline underline-offset-2 hover:text-ink">
              {t("conditions de vente")}
            </Link>
            .
          </p>
          <Link href="/panier" className="mt-5 block text-center text-sm text-muted underline-offset-4 hover:text-ink hover:underline">{t("Modifier le panier")}</Link>
        </aside>
      </form>
    </div>
  );
}
