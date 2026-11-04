import type { Metadata } from "next";
import { Suspense } from "react";
import { SalesView } from "@/components/admin/SalesView";
import { AdminPage, Loading, PageTitle } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Ventes" };

export default function Page({ searchParams }: PageProps<"/admin/ventes">) {
  return (
    <AdminPage>
      <PageTitle eyebrow="Ventes" lines={[{ text: "Ventes.", muted: "Ce que la boutique encaisse." }]} />
      <Suspense fallback={<Loading />}>
        <SalesView searchParams={searchParams} />
      </Suspense>
    </AdminPage>
  );
}
