import type { Metadata } from "next";
import { Suspense } from "react";
import { JournalView } from "@/components/admin/JournalView";
import { AdminPage, Loading, PageTitle } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Journal" };

export default function Page({ searchParams }: PageProps<"/admin/journal">) {
  return (
    <AdminPage>
      <PageTitle eyebrow="Journal" lines={[{ text: "Journal.", muted: "Tout ce qui se passe." }]} />
      <Suspense fallback={<Loading />}>
        <JournalView searchParams={searchParams} />
      </Suspense>
    </AdminPage>
  );
}
