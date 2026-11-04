import type { Metadata } from "next";
import { Suspense } from "react";
import { CreditPurchasesView } from "@/components/admin/CreditPurchasesView";
import { AdminPage, Loading, PageTitle } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Achats de crédits" };

export default function Page({ searchParams }: PageProps<"/admin/credits">) {
  return (
    <AdminPage>
      <PageTitle eyebrow="Achats de crédits" lines={[{ text: "Crédits.", muted: "Les packs à encaisser." }]} />
      <Suspense fallback={<Loading />}>
        <CreditPurchasesView searchParams={searchParams} />
      </Suspense>
    </AdminPage>
  );
}
