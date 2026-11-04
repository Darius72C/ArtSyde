import type { Metadata } from "next";
import { Suspense } from "react";
import { OrdersView } from "@/components/admin/OrdersView";
import { AdminPage, Loading, PageTitle } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Commandes" };

export default function Page({ searchParams }: PageProps<"/admin/commandes">) {
  return (
    <AdminPage>
      <PageTitle eyebrow="Commandes" lines={[{ text: "Commandes.", muted: "Du paiement à la livraison." }]} />
      <Suspense fallback={<Loading />}>
        <OrdersView searchParams={searchParams} />
      </Suspense>
    </AdminPage>
  );
}
