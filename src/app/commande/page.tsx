import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { CheckoutView } from "@/components/pages/CheckoutView";
import { onlinePaymentEnabled } from "@/server/payments/geniuspay";

export const metadata: Metadata = { title: "Commande — ArtSyde" };

export default function Page() {
  return (
    <PageShell>
      <CheckoutView online={onlinePaymentEnabled()} />
    </PageShell>
  );
}
