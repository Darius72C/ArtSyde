"use client";

import Link from "next/link";
import { use, useSyncExternalStore } from "react";
import { motion } from "motion/react";
import { DELIVERY, getOrder } from "@/lib/orders";
import { formatFCFA } from "@/lib/products";
import { Thumb } from "./CartView";
import { FadeUp } from "../Reveal";

const TRACK = ["Commande reçue", "En atelier", "Expédiée", "Livrée"];
const EASE = [0.22, 1, 0.36, 1] as const;
const noop = () => () => {};

export function OrderView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // Orders live in localStorage for now → read on the client only.
  const ready = useSyncExternalStore(noop, () => true, () => false);
  const order = ready ? getOrder(id) : undefined;
  const step = 0; // TODO: real status from the API

  if (!ready) return <div className="mx-auto my-32 h-px w-24 animate-pulse bg-ink/40" />;
  if (!order)
    return (
      <div className="mx-auto max-w-[1440px] px-5 py-28 md:px-10">
        <p className="display text-5xl">Commande introuvable.</p>
        <p className="mt-4 text-muted">Vérifie le numéro, ou connecte-toi pour retrouver tes commandes.</p>
        <Link href="/" className="btn mt-10">Accueil</Link>
      </div>
    );

  const first = order.customer.name.split(" ")[0];

  return (
    <div className="mx-auto max-w-[1440px] px-5 pb-24 md:px-10">
      <div className="pb-14 pt-14 md:pt-20">
        <motion.p className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}>
          Commande n° {order.id}
        </motion.p>
        <h1 className="display mt-6 text-5xl md:text-8xl">
          {[`Merci, ${first}.`, <span key="e" className="text-muted">C&apos;est en route.</span>].map((l, i) => (
            <span key={i} className="block overflow-hidden pb-[0.06em]">
              <motion.span className="block" initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: 1.4, ease: EASE, delay: 0.15 + i * 0.12 }}>
                {l}
              </motion.span>
            </span>
          ))}
        </h1>
        <FadeUp delay={0.5}>
          <p className="mt-6 max-w-lg text-muted">On te contacte au {order.customer.phone} pour confirmer la commande et le règlement.</p>
        </FadeUp>
      </div>

      {/* Tracking */}
      <FadeUp delay={0.3} className="tile p-8 md:p-10">
        <p className="text-[21px] font-semibold">Suivi de commande</p>
        <ol className="relative mt-10 grid grid-cols-4">
          <span className="absolute left-0 right-0 top-[6px] h-0.5 rounded-full bg-line" />
          <motion.span className="absolute left-0 top-[6px] h-0.5 origin-left rounded-full bg-accent" initial={{ width: 0 }} animate={{ width: `${(step / (TRACK.length - 1)) * 100}%` }} transition={{ delay: 0.8, duration: 1.2, ease: EASE }} />
          {TRACK.map((t, i) => (
            <li key={t} className="relative">
              <motion.span
                className={`block h-[14px] w-[14px] rounded-full border-2 ${i <= step ? "border-accent bg-accent" : "border-line bg-bg"}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6 + i * 0.12, duration: 0.6, ease: EASE }}
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
          {order.delivery !== "retrait" && (
            <p className="mt-5 text-sm leading-relaxed">
              {order.customer.address}
              <br />
              {order.customer.city}
            </p>
          )}
          <p className="mt-8 border-t border-line pt-6 text-sm text-muted">Paiement : on te contacte pour le règlement. Le paiement en ligne arrive bientôt.</p>
        </FadeUp>
      </div>

      <div className="mt-16 flex flex-wrap items-center gap-8">
        <Link href="/#boutique" className="btn">Continuer mes achats</Link>
        <Link href="/studio" className="link-line">Créer une pièce <span className="arrow">›</span></Link>
      </div>
    </div>
  );
}
