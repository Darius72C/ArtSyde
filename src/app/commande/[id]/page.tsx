import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { OrderView } from "@/components/pages/OrderView";

export const metadata: Metadata = { title: "Ma commande — ArtSyde", robots: { index: false } };

export default function Page({ params }: PageProps<"/commande/[id]">) {
  return (
    <PageShell>
      <Suspense fallback={<div className="mx-auto my-32 h-px w-24 animate-pulse bg-ink/40" />}>
        <OrderView params={params} />
      </Suspense>
    </PageShell>
  );
}
