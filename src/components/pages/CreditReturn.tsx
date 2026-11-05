"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { checkCreditPayment, payCreditsNow } from "@/server/payment-actions";

/** Back from GeniusPay after buying credits (/credits?achat=CR-…): the payment checked, and the outcome. */
export function CreditReturn({ reference, failed }: { reference: string; failed: boolean }) {
  const [state, setState] = useState<"checking" | "paid" | "pending" | "failed">(failed ? "failed" : "checking");
  const [message, setMessage] = useState<string>();
  const [pending, start] = useTransition();
  const tries = useRef(0);

  useEffect(() => {
    if (failed) return;
    let stop = false;
    const check = async () => {
      const s = await checkCreditPayment(reference).catch(() => "pending" as const);
      if (stop) return;
      if (s === "paid") return setState("paid");
      if (s === "failed") return setState("failed");
      if (++tries.current < 6) setTimeout(check, 3000);
      else setState("pending");
    };
    void check();
    return () => {
      stop = true;
    };
  }, [failed, reference]);

  const retry = () =>
    start(async () => {
      const r = await payCreditsNow(reference).catch(() => null);
      if (r?.ok) return window.location.assign(r.url);
      setMessage(r?.message ?? "Connexion perdue. Réessaie.");
    });

  return (
    <div role="status" className="tile mb-14 max-w-2xl p-8">
      {state === "checking" && (
        <p className="flex items-center gap-4">
          <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden />
          On vérifie ton paiement auprès de GeniusPay…
        </p>
      )}
      {state === "paid" && (
        <>
          <p className="eyebrow">Paiement reçu</p>
          <p className="display mt-2 text-4xl">Tes crédits sont arrivés.</p>
          <p className="mt-3 text-muted">Achat {reference}. Ils sont sur ton compte, prêts pour le studio.</p>
          <div className="mt-6 flex flex-wrap items-center gap-6">
            <Link href="/studio" className="btn">Ouvrir le studio</Link>
            <Link href="/compte" className="link-line">
              Mon compte <span className="arrow">›</span>
            </Link>
          </div>
        </>
      )}
      {state === "pending" && <p className="text-muted">Paiement en cours de confirmation par GeniusPay. Tes crédits arrivent dès qu&apos;il est confirmé : tu peux fermer cette page.</p>}
      {state === "failed" && (
        <>
          <p className="text-[19px] font-semibold">Le paiement n&apos;a pas abouti.</p>
          <p className="mt-2 text-sm text-muted">Ton achat {reference} est gardé : tu peux réessayer.</p>
          <button type="button" onClick={retry} disabled={pending} className="btn mt-5">
            {pending ? <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-label="Ouverture du paiement" /> : "Réessayer le paiement"}
          </button>
          {message && <p className="mt-3 text-sm text-danger">{message}</p>}
        </>
      )}
    </div>
  );
}
