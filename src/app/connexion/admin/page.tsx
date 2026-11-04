import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { RevealLines } from "@/components/Reveal";
import { SignInForm } from "@/components/admin/SignInForm";
import { isAdmin } from "@/lib/admin/auth";
import { safeAdminPath } from "@/lib/admin/token";

export const metadata: Metadata = {
  title: "Connexion admin — ArtSyde",
  robots: { index: false, follow: false },
};

export default function Page({ searchParams }: PageProps<"/connexion/admin">) {
  return (
    <PageShell footer={false}>
      <div className="mx-auto max-w-md px-5 pb-24 pt-14 md:pt-20">
        <p className="eyebrow mb-5">Admin</p>
        <RevealLines as="h1" lines={[{ text: "L'atelier,", muted: "côté coulisses." }]} className="display text-5xl md:text-6xl" />
        <p className="mt-5 text-muted">Entre le mot de passe de l&apos;équipe pour voir les commandes, les clients et les ventes.</p>
        {/* The return address and the session are request data: they stream in; the shell shows the same form. */}
        <Suspense fallback={<SignInForm from="/admin" configured />}>
          <Gate searchParams={searchParams} />
        </Suspense>
      </div>
    </PageShell>
  );
}

async function Gate({ searchParams }: Pick<PageProps<"/connexion/admin">, "searchParams">) {
  const { de } = await searchParams;
  const from = safeAdminPath(Array.isArray(de) ? de[0] : de);
  if (await isAdmin()) redirect(from);
  return <SignInForm from={from} configured={!!process.env.ADMIN_PASSWORD} />;
}
