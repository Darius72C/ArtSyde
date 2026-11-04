import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { CheckoutView } from "@/components/pages/CheckoutView";

export const metadata: Metadata = { title: "Commande — ArtSyde" };

export default function Page() {
  return (
    <PageShell>
      <CheckoutView />
    </PageShell>
  );
}
