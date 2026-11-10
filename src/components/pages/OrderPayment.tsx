"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { PAYMENT_METHODS, PAYMENT_METHOD_IDS, type PaymentMethodId } from "@/lib/credits";
import { checkOrderPayment, payOrderNow } from "@/server/payment-actions";
import { paymentFee } from "@/lib/payment-fees";
import { formatFCFA } from "@/lib/products";

/**
 * An order still waiting for its payment, with online payment on. Back from GeniusPay (`returning`), it checks
 * the payment right away (a few tries while GeniusPay confirms); otherwise, or if it failed, "Payer maintenant".
 */
export function OrderPayment({ reference, orderKey, amount, returning, failed }: { reference: string; orderKey: string; amount: number; returning: boolean; failed: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "pending" | "failed" | "idle">(returning ? "checking" : failed ? "failed" : "idle");
  const [method, setMethod] = useState<PaymentMethodId>("WAVE");
  const [message, setMessage] = useState<string>();
  const [pending, start] = useTransition();
  const tries = useRef(0);

  useEffect(() => {
    if (!returning) return;
    let stop = false;
    const check = async () => {
      const s = await checkOrderPayment(reference, orderKey).catch(() => "pending" as const);
      if (stop) return;
      if (s === "paid") return router.refresh(); // the page shows it paid
      if (s === "failed") return setState("failed");
      if (++tries.current < 6) setTimeout(check, 3000); // GeniusPay can take a few seconds to confirm
      else setState("pending");
    };
    void check();
    return () => {
      stop = true;
    };
  }, [returning, reference, orderKey, router]);

  const pay = () =>
    start(async () => {
      setMessage(undefined);
      const r = await payOrderNow(reference, orderKey, method).catch(() => null);
      if (r?.ok) return window.location.assign(r.url);
      setMessage(r?.message ?? "Connexion perdue. Réessaie.");
    });

  if (state === "checking")
    return (
      <div role="status" className="tile mt-8 flex max-w-2xl items-center gap-4 p-6">
        <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden />
        <p>On vérifie ton paiement auprès de GeniusPay…</p>
      </div>
    );

  return (
    <div className="tile mt-8 max-w-2xl p-6 md:p-8">
      <p className="text-[19px] font-semibold">{state === "failed" ? "Le paiement n'a pas abouti." : state === "pending" ? "Paiement en cours de confirmation." : "Il ne reste plus qu'à payer."}</p>
      <p className="mt-2 text-sm text-muted">
        {state === "pending"
          ? "GeniusPay ne l'a pas encore confirmé : cette page se mettra à jour toute seule dès que c'est fait. Si tu n'as pas payé, tu peux le faire maintenant."
          : "Ta commande est gardée. Choisis ton moyen de paiement, tu règles sur la page sécurisée de GeniusPay."}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Moyen de paiement">
        {PAYMENT_METHOD_IDS.map((k) => (
          <button key={k} type="button" role="radio" aria-checked={method === k} onClick={() => setMethod(k)} className={`rounded-xl border px-3 py-2.5 text-sm transition-colors ${method === k ? "border-accent font-medium shadow-[0_0_0_1px_var(--accent)]" : "border-line hover:border-muted"}`}>
            <span className="block">{PAYMENT_METHODS[k]}</span>
            <span className="block text-xs font-normal tabular-nums text-muted">Frais {formatFCFA(paymentFee(amount, k))}</span>
          </button>
        ))}
      </div>
      <button type="button" onClick={pay} disabled={pending} className="btn mt-5">
        {pending ? <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-label="Ouverture du paiement" /> : `Payer ${formatFCFA(amount + paymentFee(amount, method))}`}
      </button>
      {message && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {message}
        </p>
      )}
    </div>
  );
}
