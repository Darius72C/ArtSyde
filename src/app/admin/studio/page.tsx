import type { Metadata } from "next";
import { Suspense } from "react";
import { StudioAdminView } from "@/components/admin/StudioAdminView";
import { AdminPage, Loading, PageTitle } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Studio" };

export default function Page() {
  return (
    <AdminPage>
      <PageTitle eyebrow="Studio" lines={[{ text: "Studio.", muted: "Crédits et designs sauvegardés." }]} />
      <Suspense fallback={<Loading />}>
        <StudioAdminView />
      </Suspense>
    </AdminPage>
  );
}
