import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductEditView } from "@/components/admin/ProductEditView";
import { AdminPage, Loading } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Modèle" };

export default function Page({ params, searchParams }: PageProps<"/admin/produits/[id]">) {
  return (
    <AdminPage>
      <Suspense fallback={<Loading />}>
        <ProductEditView params={params} searchParams={searchParams} />
      </Suspense>
    </AdminPage>
  );
}
