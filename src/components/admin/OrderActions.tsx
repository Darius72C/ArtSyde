"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { OrderStatus } from "@/generated/prisma/client";
import { cancelOrder, markOrderPaid, setOrderStep, type OrderActionResult } from "@/server/admin/orders";

/** The next step of a paid order and its button label (in design only when it has studio pieces). */
function nextStep(status: OrderStatus, hasStudio: boolean, pickup: boolean): { status: OrderStatus; label: string } | null {
  switch (status) {
    case "PAID":
      return hasStudio ? { status: "IN_DESIGN", label: "Passer en conception" } : { status: "IN_PRODUCTION", label: "Lancer l'impression" };
    case "IN_DESIGN":
      return { status: "IN_PRODUCTION", label: "Lancer l'impression" };
    case "IN_PRODUCTION":
      return { status: "SHIPPED", label: pickup ? "Prête à l'atelier" : "Expédier" };
    case "SHIPPED":
      return { status: "DELIVERED", label: pickup ? "Retirée par le client" : "Marquer livrée" };
    default:
      return null;
  }
}

/** The buttons that move an order along: paid (takes the t-shirts out of the stock), next step, cancel. */
export function OrderActions({ orderId, status, hasStudio, pickup }: { orderId: string; status: OrderStatus; hasStudio: boolean; pickup: boolean }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [result, setResult] = useState<OrderActionResult | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const next = nextStep(status, hasStudio, pickup);
  if (status === "CANCELLED" || status === "DELIVERED") return null;

  const run = (fn: () => Promise<OrderActionResult>) =>
    startTransition(async () => {
      setResult(await fn());
      setConfirmCancel(false);
      router.refresh();
    });

  return (
    <div className="mt-8 border-t border-line pt-8">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {status === "PENDING_PAYMENT" ? (
          <button type="button" disabled={busy} onClick={() => run(() => markOrderPaid(orderId))} className="btn">
            {busy ? <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-label="Enregistrement" /> : "Marquer payée"}
          </button>
        ) : (
          next && (
            <button type="button" disabled={busy} onClick={() => run(() => setOrderStep(orderId, next.status))} className="btn">
              {busy ? <span className="h-4 w-4 animate-spin rounded-full border border-on-ink border-t-transparent" aria-label="Enregistrement" /> : next.label}
            </button>
          )
        )}
        {confirmCancel ? (
          <span className="flex items-center gap-4 text-[15px]">
            <button type="button" disabled={busy} onClick={() => run(() => cancelOrder(orderId))} className="text-danger hover:underline">
              Oui, annuler la commande
            </button>
            <button type="button" onClick={() => setConfirmCancel(false)} className="text-link hover:underline">
              Non
            </button>
          </span>
        ) : (
          <button type="button" disabled={busy} onClick={() => setConfirmCancel(true)} className="text-[15px] text-danger hover:underline">
            Annuler la commande
          </button>
        )}
      </div>
      {status === "PENDING_PAYMENT" && <p className="mt-3 text-sm text-muted">Une fois le paiement reçu : les t-shirts vierges de la commande sortent du stock.</p>}
      {result && (
        <div role="status" className="mt-4 space-y-1 text-sm">
          <p className={result.ok ? "text-ok" : "text-danger"}>{result.message}</p>
          {result.ok &&
            result.warnings?.map((w) => (
              <p key={w} className="text-new">
                {w}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
