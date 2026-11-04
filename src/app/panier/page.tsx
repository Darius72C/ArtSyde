import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { CartView } from "@/components/pages/CartView";

export const metadata: Metadata = { title: "Mon panier — ArtSyde" };

export default function Page() {
  return (
    <PageShell>
      <CartView />
    </PageShell>
  );
}
