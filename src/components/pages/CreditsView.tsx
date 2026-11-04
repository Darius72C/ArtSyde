"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { CreditPack } from "@/generated/prisma/client";
import { buyCredits } from "@/server/buy-credits";
import { CREDIT_PACKS, CREDIT_PACK_IDS, PAYMENT_METHODS, PAYMENT_METHOD_IDS, type CreditFields, type PaymentMethodId } from "@/lib/credits";
import { checkFields } from "@/lib/orders";
import { formatFCFA } from "@/lib/products";
import { DUR, EASE, SPRING } from "@/lib/motion";
import { Field } from "./CheckoutView";
import { RevealLines } from "../Reveal";

const DEFAULT_PACK: CreditPack = "CREATEUR";
const packFrom = (v: string | null) => CREDIT_PACK_IDS.find((p) => p === v?.toUpperCase()) ?? DEFAULT_PACK;

/** /credits?pack=studio preselects a pack (links from the home page). */
export function CreditsViewFromUrl() {
  return <CreditsView initialPack={packFrom(useSearchParams().get("pack"))} />;
}

const sectionTitle = "border-b border-line pb-4 text-[24px] font-semibold tracking-[-0.02em]";

export function CreditsView({ initialPack = DEFAULT_PACK }: { initialPack?: CreditPack }) {
  const [pack, setPack] = useState<CreditPack>(initialPack);
  const [method, setMethod] = useState<PaymentMethodId>("WAVE");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string>();
  const [done, setDone] = useState<{ reference: string; phone: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const p = CREDIT_PACKS[pack];
  const doneTitle = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (done) doneTitle.current?.focus();
  }, [done]);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string | undefined>;
    const fields: CreditFields = { name: f.name ?? "", phone: f.phone ?? "", email: f.email ?? "" };
    const err = checkFields({ ...fields, city: "", address: "", notes: "" }, "RETRAIT");
    setErrors(err);
    setMessage(undefined);
    if (Object.keys(err).length) return;
    startTransition(async () => {
      const r = await buyCredits({ pack, method, fields }).catch(() => null);
      if (!r) return setMessage("Connexion perdue. Vérifie ton réseau et réessaie.");
      if (!r.ok) {
        setErrors(r.errors);
        setMessage(r.message);
        return;
      }
      setDone({ reference: r.reference, phone: fields.phone });
    });
  }

  return (
    <div className="mx-auto max-w-[1440px] px-5 md:px-10">
      <div className="pb-10 pt-14 md:pt-20">
        <RevealLines as="h1" lines={[{ text: "Recharger", muted: "mes crédits." }]} className="display text-5xl md:text-7xl" />
        <p className="lead mt-5 max-w-xl">Les crédits servent à importer une image, sauvegarder un design et télécharger ton visuel en HD. Tourner et colorer ton t-shirt reste gratuit.</p>
      </div>

      <AnimatePresence mode="wait">
        {done ? (
          <motion.div key="done" role="status" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DUR.slow, ease: EASE.out }} className="tile mb-24 max-w-2xl p-8 md:p-10">
            <motion.svg viewBox="0 0 52 52" className="h-14 w-14 text-ok" initial={{ scale: 0.6, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={SPRING.bouncy} aria-hidden>
              <motion.circle cx="26" cy="26" r="24" fill="none" stroke="currentColor" strokeWidth="2.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: DUR.base, ease: EASE.out }} />
              <motion.path d="M15 27l7 7 15-16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: DUR.fast, delay: 0.45, ease: EASE.out }} />
            </motion.svg>
            <p className="eyebrow mt-6">Demande enregistrée</p>
            <h2 ref={doneTitle} tabIndex={-1} className="display mt-2 text-4xl outline-none md:text-5xl">{p.credits} crédits t&apos;attendent.</h2>
            <p className="mt-4 max-w-lg text-muted">
              Référence <span className="font-semibold text-ink">{done.reference}</span>. On t&apos;envoie la demande de paiement {PAYMENT_METHODS[method]} de {formatFCFA(p.priceXof)} au {done.phone}. Tes crédits sont ajoutés dès que le paiement est reçu.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <Link href="/studio" className="btn">Retour au studio</Link>
              <Link href="/" className="link-line">
                Accueil <span className="arrow">›</span>
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.form key="form" exit={{ opacity: 0 }} transition={{ duration: DUR.instant, ease: EASE.in }} method="post" onSubmit={submit} noValidate className="grid items-start gap-14 pb-24 lg:grid-cols-[1fr_400px] lg:gap-20">
            <div className="space-y-16">
              <section>
                <p className={sectionTitle}>Ton pack</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Pack de crédits">
                  {CREDIT_PACK_IDS.map((k) => {
                    const c = CREDIT_PACKS[k];
                    const on = pack === k;
                    return (
                      <button type="button" role="radio" aria-checked={on} key={k} onClick={() => setPack(k)} className={`relative flex flex-col items-center rounded-2xl border px-5 pb-6 pt-8 text-center transition-colors ${on ? "border-accent shadow-[0_0_0_1px_var(--accent)]" : "border-line hover:border-muted"}`}>
                        {c.best && <span className="absolute -top-px left-1/2 -translate-x-1/2 rounded-b-xl bg-accent px-3 py-1 text-[12px] font-medium text-white">Le plus choisi</span>}
                        <span className="text-[17px] font-semibold">{c.name}</span>
                        <span className="display mt-3 text-[64px] leading-none tabular-nums">{c.credits}</span>
                        <span className="text-sm text-muted">crédits</span>
                        <span className="mt-4 text-[17px] font-semibold tabular-nums">{formatFCFA(c.priceXof)}</span>
                        <span className="mt-1 text-xs text-muted">{c.note}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <p className={sectionTitle}>Tes coordonnées</p>
                <div className="mt-8 grid gap-8 sm:grid-cols-2">
                  <Field error={errors.name} name="name" label="Nom complet" autoComplete="name" />
                  <Field error={errors.phone} name="phone" label="Téléphone" type="tel" autoComplete="tel" placeholder="Pour la demande de paiement" />
                  <div className="sm:col-span-2">
                    <Field error={errors.email} name="email" label="E-mail (facultatif)" type="email" autoComplete="email" placeholder="Pour recevoir la confirmation" />
                  </div>
                </div>
              </section>

              <section>
                <p className={sectionTitle}>Paiement</p>
                <div className="mt-6" role="radiogroup" aria-label="Moyen de paiement">
                  {PAYMENT_METHOD_IDS.map((k) => {
                    const on = method === k;
                    return (
                      <button type="button" role="radio" aria-checked={on} key={k} onClick={() => setMethod(k)} className={`mb-3 flex w-full items-center gap-5 rounded-2xl border px-5 py-4 text-left transition-colors ${on ? "border-accent shadow-[0_0_0_1px_var(--accent)]" : "border-line hover:border-muted"}`}>
                        <span className={`grid h-5 w-5 place-items-center rounded-full border transition ${on ? "border-accent" : "border-line"}`}>
                          {on && <motion.span layoutId="pay-dot" className="h-2.5 w-2.5 rounded-full bg-accent" />}
                        </span>
                        <span className="flex-1">
                          <span className="block text-[17px] font-semibold">{PAYMENT_METHODS[k]}</span>
                          <span className="text-sm text-muted">Mobile money</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-6 text-[21px] font-semibold">Paiement en ligne bientôt disponible.</p>
                <p className="mt-2 max-w-lg text-sm text-muted">Ta demande est enregistrée et on t&apos;envoie la demande de paiement sur ton numéro. Tes crédits arrivent dès qu&apos;il est reçu.</p>
              </section>
            </div>

            <aside className="tile p-8 lg:sticky lg:top-20">
              <p className="text-[21px] font-semibold">Ton achat</p>
              <dl className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-muted">Pack</dt><dd>{p.name}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Crédits</dt><dd className="tabular-nums">{p.credits}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Paiement</dt><dd>{PAYMENT_METHODS[method]}</dd></div>
              </dl>
              <div className="mt-6 flex items-baseline justify-between border-t border-line pt-6">
                <span className="font-semibold">Total</span>
                <motion.span key={p.priceXof} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="display text-3xl tabular-nums">{formatFCFA(p.priceXof)}</motion.span>
              </div>
              <AnimatePresence>
                {message && (
                  <motion.p role="alert" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: DUR.fast, ease: EASE.out }} className="mt-6 text-sm text-danger">
                    {message}
                  </motion.p>
                )}
              </AnimatePresence>
              <button disabled={pending} className="btn mt-8 w-full">
                {pending ? <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-label="Envoi" /> : "Valider l'achat"}
              </button>
              <Link href="/studio" className="mt-5 block text-center text-sm text-muted underline-offset-4 hover:text-ink hover:underline">Retour au studio</Link>
            </aside>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
