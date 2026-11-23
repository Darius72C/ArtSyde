import { pageMetadata } from "@/lib/i18n/server";
import { PageShell } from "@/components/PageShell";
import { CheckoutView } from "@/components/pages/CheckoutView";
import { onlinePaymentEnabled } from "@/server/payments/geniuspay";

export const generateMetadata = pageMetadata("Commande — ArtSyde", "/commande");

export default function Page() {
  return (
    <PageShell>
      <CheckoutView online={onlinePaymentEnabled()} />
    </PageShell>
  );
}
