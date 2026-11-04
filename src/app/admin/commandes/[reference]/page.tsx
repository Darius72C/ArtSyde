import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderDetailView } from "@/components/admin/OrderDetailView";
import { AdminPage, Loading } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Commande" };

export default function Page({ params }: PageProps<"/admin/commandes/[reference]">) {
  return (
    <AdminPage>
      <Suspense fallback={<Loading />}>
        <OrderDetailView params={params} />
      </Suspense>
    </AdminPage>
  );
}
