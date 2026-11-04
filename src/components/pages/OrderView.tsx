"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { DELIVERY, tracking, type PublicOrder } from "@/lib/orders";
import { formatFCFA } from "@/lib/products";
import { Thumb } from "./CartView";
import { FadeUp } from "../Reveal";
import { DUR, EASE, STAGGER } from "@/lib/motion";

export function OrderView({ order }: { order: PublicOrder | null }) {
  if (!order)
    return (
      <div className="mx-auto max-w-[1440px] px-5 py-28 md:px-10">
        <p className="display text-5xl">Commande introuvable.</p>
        <p className="mt-4 text-muted">Vérifie le lien reçu après ta commande, ou connecte-toi pour retrouver tes commandes.</p>
        <Link href="/" className="btn mt-10">Accueil</Link>
      </div>
    );

  const { steps: TRACK, step } = tracking(order.status, order.delivery);
  const cancelled = step < 0;
  const first = order.firstName;
  const heading = cancelled ? [`${first},`, "ta commande est annulée."] : order.status === "DELIVERED" ? [`Merci, ${first}.`, "Bien reçue."] : [`Merci, ${first}.`, "C'est en route."];
  const lead = cancelled
    ? `Une question ? On reste joignable au même numéro, ou écris-nous en citant la référence ${order.reference}.`
    : order.status === "PENDING_PAYMENT"
      ? `On te contacte au ${order.phone} pour confirmer la commande et le règlement.`
      : "Ton règlement est bien reçu. Suis l'avancement de ta commande ici.";

  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-24 md:px-10">
      <div className="pb-14 pt-14 md:pt-20">
        <motion.p className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: DUR.reveal, ease: EASE.out }}>
          Commande n° {order.reference}
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
      </div>

      {/* Tracking */}
      <FadeUp delay={0.3} className="tile p-8 md:p-10">
        <p className="text-[21px] font-semibold">Suivi de commande</p>
        {cancelled && <p className="mt-2 text-sm text-muted">Commande annulée.</p>}
        <ol className="relative mt-10 grid grid-cols-4">
          <span className="absolute left-0 right-0 top-[6px] h-0.5 rounded-full bg-line" />
          <motion.span className="absolute left-0 top-[6px] h-0.5 origin-left rounded-full bg-accent" initial={{ width: 0 }} animate={{ width: `${(Math.max(step, 0) / (TRACK.length - 1)) * 100}%` }} transition={{ delay: 0.8, duration: DUR.reveal, ease: EASE.out }} />
          {TRACK.map((t, i) => (
            <li key={t} className="relative">
              <motion.span
                className={`block h-[14px] w-[14px] rounded-full border-2 ${i <= step ? "border-accent bg-accent" : "border-line bg-bg"}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6 + i * STAGGER.line, duration: DUR.base, ease: EASE.out }}
              />
              <span className={`mt-3 block text-[14px] ${i <= step ? "font-medium" : "text-muted"}`}>{t}</span>
            </li>
          ))}
        </ol>
      </FadeUp>

      <div className="mt-14 grid gap-14 md:grid-cols-[1.4fr_1fr]">
        <FadeUp delay={0.4}>
          <p className="border-b border-line pb-4 text-[21px] font-semibold">Articles</p>
          <ul>
            {order.items.map((it) => (
              <li key={it.key} className="flex items-center gap-5 border-b border-line py-5">
                <Thumb item={it} className="aspect-[4/5] w-16" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{it.name}</p>
                  <p className="text-xs text-muted">Taille {it.size} · × {it.qty}</p>
                </div>
                <p className="text-sm tabular-nums">{formatFCFA(it.price * it.qty)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Sous-total</dt><dd>{formatFCFA(order.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">{DELIVERY[order.delivery].label}</dt><dd>{order.shipping ? formatFCFA(order.shipping) : "Offert"}</dd></div>
            <div className="flex items-baseline justify-between border-t border-line pt-4"><dt className="font-semibold">Total</dt><dd className="display text-3xl">{formatFCFA(order.total)}</dd></div>
          </dl>
        </FadeUp>
        <FadeUp delay={0.5} className="tile self-start p-8">
          <p className="text-[21px] font-semibold">Livraison</p>
          <p className="mt-4 text-[17px] font-semibold">{DELIVERY[order.delivery].label}</p>
          <p className="text-sm text-muted">{DELIVERY[order.delivery].note}</p>
          {order.delivery !== "RETRAIT" && (
            <p className="mt-5 text-sm leading-relaxed">
              {order.address}
              <br />
              {order.city}
            </p>
          )}
          <p className="mt-8 border-t border-line pt-6 text-sm text-muted">
            {order.status === "PENDING_PAYMENT" ? "Paiement : on te contacte pour le règlement. Le paiement en ligne arrive bientôt." : cancelled ? "Paiement : aucun règlement en attente." : "Paiement : reçu, merci."}
          </p>
        </FadeUp>
      </div>

      <div className="mt-16 flex flex-wrap items-center gap-8">
        <Link href="/#boutique" className="btn">Continuer mes achats</Link>
        <Link href="/studio" className="link-line">Créer une pièce <span className="arrow">›</span></Link>
      </div>
    </div>
  );
}
