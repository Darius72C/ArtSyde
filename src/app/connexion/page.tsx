import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { LoginView } from "@/components/pages/LoginView";
import { googleEnabled } from "@/server/auth";

export const metadata: Metadata = { title: "Connexion — ArtSyde" };

/** `?suite=/studio` brings the customer back where they were; `?erreur=google` after a failed Google sign-in. */
async function Login({ searchParams }: Pick<PageProps<"/connexion">, "searchParams">) {
  const sp = await searchParams;
  const raw = typeof sp.suite === "string" ? sp.suite : "";
  // Only a path of this site (never another site).
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/compte";
  return <LoginView google={googleEnabled} next={next} failed={sp.erreur === "google"} />;
}

export default function Page(props: PageProps<"/connexion">) {
  return (
    <PageShell footer={false}>
      <Suspense fallback={<LoginView google={googleEnabled} />}>
        <Login searchParams={props.searchParams} />
      </Suspense>
    </PageShell>
  );
}
