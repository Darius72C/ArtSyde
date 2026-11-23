"use client";

import Link from "@/components/LocaleLink";
import { motion } from "motion/react";
import { DELIVERY, tracking, type PublicOrder } from "@/lib/orders";
import { formatFCFA } from "@/lib/products";
import { Thumb } from "./CartView";
import { FadeUp } from "../Reveal";
import { DUR, EASE, STAGGER } from "@/lib/motion";
import { useT } from "../I18nProvider";

/** `payment`: what to show while the order waits for its payment (online payment: OrderPayment), or nothing. */
export function OrderView({ order, payment }: { order: PublicOrder | null; payment?: React.ReactNode }) {
  const t = useT();
  if (!order)
    return (
      <div className="mx-auto max-w-[1440px] px-5 py-28 md:px-10">
        <p className="display text-5xl">{t("Commande introuvable.")}</p>
        <p className="mt-4 text-muted">{t("Vérifie le lien reçu après ta commande, ou connecte-toi pour retrouver tes commandes.")}</p>
        <Link href="/" className="btn mt-10">{t("Accueil")}</Link>
      </div>
    );

  const { steps: TRACK, step } = tracking(order.status, order.delivery);
  const cancelled = step < 0;
  const first = order.firstName;
  const heading = cancelled ? [`${first},`, t("ta commande est annulée.")] : order.status === "DELIVERED" ? [t("Merci, {name}.", { name: first }), t("Bien reçue.")] : [t("Merci, {name}.", { name: first }), t("C'est en route.")];
  const lead = cancelled
    ? t("Une question ? On reste joignable au même numéro, ou écris-nous en citant la référence {reference}.", { reference: order.reference })
    : order.status === "PENDING_PAYMENT"
      ? payment
        ? t("Ta commande est enregistrée. Dès qu'elle est payée, on lance l'impression.")
        : t("On te contacte au {phone} pour confirmer la commande et le règlement.", { phone: order.phone })
      : t("Ton règlement est bien reçu. Suis l'avancement de ta commande ici.");

  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-24 md:px-10">
      <div className="pb-14 pt-14 md:pt-20">
        <motion.p className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: DUR.reveal, ease: EASE.out }}>
          {t("Commande n° {reference}", { reference: order.reference })}
        </motion.p>
        <h1 className="display mt-6 text-5xl md:text-8xl">
          {[heading[0], <span key="e" className="text-muted">{heading[1]}</span>].map((l, i) => (
            <span key={i} className="block overflow-hidden pb-[0.06em]">
              <motion.span className="block" initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: DUR.hero, ease: EASE.out, delay: 0.15 + i * STAGGER.line }}>
                {l}
              </motion.span>
            </span>
          ))}
        </h1>
        <FadeUp delay={0.5}>
          <p className="mt-6 max-w-lg text-muted">{lead}</p>
        </FadeUp>
        {order.status === "PENDING_PAYMENT" && payment}
      </div>

      {/* Tracking */}
      <FadeUp delay={0.3} className="tile p-8 md:p-10">
        <p className="text-[21px] font-semibold">{t("Suivi de commande")}</p>
        {cancelled && <p className="mt-2 text-sm text-muted">{t("Commande annulée.")}</p>}
        <ol className="relative mt-10 grid grid-cols-4">
          <span className="absolute left-0 right-0 top-[6px] h-0.5 rounded-full bg-line" />
          <motion.span className="absolute left-0 top-[6px] h-0.5 origin-left rounded-full bg-accent" initial={{ width: 0 }} animate={{ width: `${(Math.max(step, 0) / (TRACK.length - 1)) * 100}%` }} transition={{ delay: 0.8, duration: DUR.reveal, ease: EASE.out }} />
          {TRACK.map((label, i) => (
            <li key={label} className="relative">
              <motion.span
                className={`block h-[14px] w-[14px] rounded-full border-2 ${i <= step ? "border-accent bg-accent" : "border-line bg-bg"}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6 + i * STAGGER.line, duration: DUR.base, ease: EASE.out }}
              />
              <span className={`mt-3 block text-[14px] ${i <= step ? "font-medium" : "text-muted"}`}>{t(label)}</span>
            </li>
          ))}
        </ol>
      </FadeUp>

      <div className="mt-14 grid gap-14 md:grid-cols-[1.4fr_1fr]">
        <FadeUp delay={0.4}>
          <p className="border-b border-line pb-4 text-[21px] font-semibold">{t("Articles")}</p>
          <ul>
            {order.items.map((it) => (
              <li key={it.key} className="flex items-center gap-5 border-b border-line py-5">
                <Thumb item={it} className="aspect-[4/5] w-16" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{t(it.name)}</p>
                  <p className="text-xs text-muted">{t("Taille {size}", { size: it.size })} · × {it.qty}</p>
                </div>
                <p className="text-sm tabular-nums">{formatFCFA(it.price * it.qty)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">{t("Sous-total")}</dt><dd>{formatFCFA(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between"><dt className="text-muted">{t("Code {code}", { code: order.promoCode ?? "" })}</dt><dd className="text-ok">-{formatFCFA(order.discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">{t(DELIVERY[order.delivery].label)}</dt><dd>{order.shipping ? formatFCFA(order.shipping) : t("Offert")}</dd></div>
            {order.paymentFee > 0 && <div className="flex justify-between"><dt className="text-muted">{t("Frais de paiement")}</dt><dd>{formatFCFA(order.paymentFee)}</dd></div>}
            <div className="flex items-baseline justify-between border-t border-line pt-4"><dt className="font-semibold">{t("Total")}</dt><dd className="display text-3xl">{formatFCFA(order.total)}</dd></div>
          </dl>
        </FadeUp>
        <FadeUp delay={0.5} className="tile self-start p-8">
          <p className="text-[21px] font-semibold">{t("Livraison")}</p>
          <p className="mt-4 text-[17px] font-semibold">{t(DELIVERY[order.delivery].label)}</p>
          <p className="text-sm text-muted">{t(DELIVERY[order.delivery].note)}</p>
          {order.delivery !== "RETRAIT" && (
            <p className="mt-5 text-sm leading-relaxed">
              {order.address}
              <br />
              {order.city}
            </p>
          )}
          <p className="mt-8 border-t border-line pt-6 text-sm text-muted">
            {order.status === "PENDING_PAYMENT" ? (payment ? t("Paiement : en attente.") : t("Paiement : on te contacte pour le règlement.")) : cancelled ? t("Paiement : aucun règlement en attente.") : t("Paiement : reçu, merci.")}
          </p>
        </FadeUp>
      </div>

      <div className="mt-16 flex flex-wrap items-center gap-8">
        <Link href="/#boutique" className="btn">{t("Continuer mes achats")}</Link>
        <Link href="/studio" className="link-line">{t("Créer une pièce")} <span className="arrow">›</span></Link>
      </div>
    </div>
  );
}
