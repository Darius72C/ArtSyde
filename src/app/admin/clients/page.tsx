import type { Metadata } from "next";
import { Suspense } from "react";
import { CustomersView } from "@/components/admin/CustomersView";
import { AdminPage, Loading, PageTitle } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Clients" };

export default function Page({ searchParams }: PageProps<"/admin/clients">) {
  return (
    <AdminPage>
      <PageTitle eyebrow="Clients" lines={[{ text: "Clients.", muted: "Qui achète, qui crée." }]} />
      <Suspense fallback={<Loading />}>
        <CustomersView searchParams={searchParams} />
      </Suspense>
    </AdminPage>
  );
}
