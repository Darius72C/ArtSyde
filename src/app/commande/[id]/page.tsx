import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { OrderView } from "@/components/pages/OrderView";
import { getPublicOrder } from "@/server/order-lookup";

export const metadata: Metadata = { title: "Ma commande — ArtSyde", robots: { index: false } };

/** `id` is the order reference (AS-2611-0143); `?k=` is the key the checkout gave with it. */
async function Order({ params, searchParams }: PageProps<"/commande/[id]">) {
  const [{ id }, { k }] = await Promise.all([params, searchParams]);
  const order = await getPublicOrder(decodeURIComponent(id), typeof k === "string" ? k : undefined);
  return <OrderView order={order} />;
}

export default function Page(props: PageProps<"/commande/[id]">) {
  return (
    <PageShell>
      <Suspense fallback={<div className="mx-auto my-32 h-px w-24 animate-pulse bg-ink/40" />}>
        <Order {...props} />
      </Suspense>
    </PageShell>
  );
}
