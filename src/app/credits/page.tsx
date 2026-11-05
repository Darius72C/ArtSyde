import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { CreditsView, CreditsViewFromUrl } from "@/components/pages/CreditsView";
import { onlinePaymentEnabled } from "@/server/payments/geniuspay";
import { AdSlot } from "@/components/AdSlot";

export const metadata: Metadata = { title: "Crédits studio — ArtSyde" };

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
