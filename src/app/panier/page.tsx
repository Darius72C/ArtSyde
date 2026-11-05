import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { CartView } from "@/components/pages/CartView";
import { getCatalog } from "@/server/catalog";
import { LiveRefresh } from "@/components/LiveRefresh";
import { AdSlot } from "@/components/AdSlot";

export const metadata: Metadata = { title: "Mon panier — ArtSyde" };

export default async function Page() {
  const products = await getCatalog();
  return (
    <PageShell>
      <CartView products={products} />
      <AdSlot placement="cart" />
      <LiveRefresh src="/api/live/stock" events={["stock"]} />
    </PageShell>
  );
}
