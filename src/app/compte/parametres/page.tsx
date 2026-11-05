import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { AccountSettings } from "@/components/pages/AccountSettings";
import { getMyCustomer } from "@/server/account";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Paramètres du compte — ArtSyde", robots: { index: false } };

async function Settings() {
  const me = await getMyCustomer();
  if (!me) redirect("/connexion?suite=/compte/parametres");
  const providers = (await db.account.findMany({ where: { userId: me.user.id }, select: { providerId: true } })).map((a) => a.providerId);
  return (
    <AccountSettings
      email={me.user.email}
      name={me.customer.name || me.user.name}
      phone={me.customer.phone ?? ""}
      hasPassword={providers.includes("credential")}
      google={providers.includes("google")}
    />
  );
}

export default function Page() {
  return (
    <PageShell>
      <Suspense fallback={<div className="mx-auto my-32 h-px w-24 animate-pulse bg-ink/40" />}>
        <Settings />
      </Suspense>
    </PageShell>
  );
}
