import { pageMetadata } from "@/lib/i18n/server";
import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { CreditsView, CreditsViewFromUrl } from "@/components/pages/CreditsView";
import { onlinePaymentEnabled } from "@/server/payments/geniuspay";
import { AdSlot } from "@/components/AdSlot";

export const generateMetadata = pageMetadata("Crédits studio — ArtSyde", "/credits");

export default function Page() {
  return (
    <PageShell>
      {/* ?pack=… is request data: stream it; the fallback renders the same page with the default pack. */}
      <Suspense fallback={<CreditsView online={onlinePaymentEnabled()} />}>
        <CreditsViewFromUrl online={onlinePaymentEnabled()} />
      </Suspense>
      <AdSlot placement="credits" />
    </PageShell>
  );
}
