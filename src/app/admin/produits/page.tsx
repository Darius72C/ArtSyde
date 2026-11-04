import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductsView } from "@/components/admin/ProductsView";
import { AdminPage, Loading, PageTitle } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Produits et stock" };

export default function Page() {
  return (
    <AdminPage>
      <PageTitle eyebrow="Produits et stock" lines={[{ text: "Produits et stock.", muted: "Ce qui se vend, ce qui reste." }]} />
      <Suspense fallback={<Loading />}>
        <ProductsView />
      </Suspense>
    </AdminPage>
  );
}
