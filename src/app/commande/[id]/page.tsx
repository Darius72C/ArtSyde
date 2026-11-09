import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { OrderView } from "@/components/pages/OrderView";
import { getPublicOrder } from "@/server/order-lookup";
import { LiveRefresh } from "@/components/LiveRefresh";
import { OrderPayment } from "@/components/pages/OrderPayment";
import { onlinePaymentEnabled } from "@/server/payments/geniuspay";

export const metadata: Metadata = { title: "Ma commande — ArtSyde", robots: { index: false } };

/** `id` is the order reference (AS-7KP3-QX9M; AS-2611-0143 for the first orders); `?k=` is the key the checkout gave with it. */
async function Order({ params, searchParams }: PageProps<"/commande/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const k = sp.k;
  const order = await getPublicOrder(decodeURIComponent(id), typeof k === "string" ? k : undefined);
  return (
    <>
      <OrderView
        order={order}
        payment={
          order && typeof k === "string" && onlinePaymentEnabled() ? (
            <OrderPayment reference={order.reference} orderKey={k} returning={sp.paiement === "retour"} failed={sp.paiement === "echec" || order.payment === "FAILED"} />
          ) : undefined
        }
      />
      {/* The tracking follows the workshop live (paid, in production, shipped…). */}
      {order && typeof k === "string" && <LiveRefresh src={`/api/live/order?ref=${encodeURIComponent(order.reference)}&k=${encodeURIComponent(k)}`} events={["order"]} />}
    </>
  );
}

export default function Page(props: PageProps<"/commande/[id]">) {
  return (
    <PageShell>
      <Suspense fallback={<div className="mx-auto my-32 h-px w-24 animate-pulse bg-ink/40" />}>
        <Order {...props} />
      </Suspense>
    </PageShell>
  );
}
