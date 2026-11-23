import { pageMetadata } from "@/lib/i18n/server";
import { PageShell } from "@/components/PageShell";
import { CartView } from "@/components/pages/CartView";
import { getCatalog } from "@/server/catalog";
import { StockWatch } from "@/components/StockWatch";
import { AdSlot } from "@/components/AdSlot";

export const generateMetadata = pageMetadata("Mon panier — ArtSyde", "/panier");

export default async function Page() {
  const products = await getCatalog();
  return (
    <PageShell>
      <CartView products={products} />
      <AdSlot placement="cart" />
      <StockWatch />
    </PageShell>
  );
}
