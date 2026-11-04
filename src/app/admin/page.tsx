import type { Metadata } from "next";
import { Suspense } from "react";
import { OverviewView } from "@/components/admin/OverviewView";
import { AdminPage, Loading, PageTitle } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Vue d'ensemble" };

export default function Page() {
  return (
    <AdminPage>
      <PageTitle eyebrow="Vue d'ensemble" lines={[{ text: "L'atelier.", muted: "En un coup d'œil." }]} />
      <Suspense fallback={<Loading />}>
        <OverviewView />
      </Suspense>
    </AdminPage>
  );
}
