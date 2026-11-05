import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { AccountView } from "@/components/pages/AccountView";
import { ORDER_STATUS } from "@/lib/admin/labels";
import { orderHref, orderKey } from "@/lib/orders";
import { creditBalance, getMyCustomer } from "@/server/account";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Mon compte — ArtSyde", robots: { index: false } };

async function Account() {
  const me = await getMyCustomer();
  if (!me) redirect("/connexion?suite=/compte");
  const { user, customer } = me;
  // Orders of this customer, and (when the e-mail is verified, e.g. Google) the ones placed with this e-mail before signing up.
  const [orders, credits] = await Promise.all([
    db.order.findMany({
      where: { OR: [{ customerId: customer.id }, ...(user.emailVerified ? [{ customerId: null, customerEmail: { equals: user.email, mode: "insensitive" as const } }] : [])] },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, reference: true, createdAt: true, status: true, totalXof: true, items: { select: { quantity: true } } },
    }),
    creditBalance(customer.id),
  ]);
  return (
    <AccountView
      name={user.name || user.email}
      email={user.email}
      credits={credits}
      orders={orders.map((o) => ({
        reference: o.reference,
        href: orderHref(o.reference, orderKey(o.id)),
        date: o.createdAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }),
        status: ORDER_STATUS[o.status].label,
        total: o.totalXof,
        items: o.items.reduce((n, i) => n + i.quantity, 0),
      }))}
    />
  );
}

export default function Page() {
  return (
    <PageShell>
      <Suspense fallback={<div className="mx-auto my-32 h-px w-24 animate-pulse bg-ink/40" />}>
        <Account />
      </Suspense>
    </PageShell>
  );
}
