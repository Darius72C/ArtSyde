import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { CartView } from "@/components/pages/CartView";
import { getCatalog } from "@/server/catalog";

export const metadata: Metadata = { title: "Mon panier — ArtSyde" };

export default async function Page() {
  const products = await getCatalog();
  return (
    <PageShell>
      <CartView products={products} />
    </PageShell>
  );
}
