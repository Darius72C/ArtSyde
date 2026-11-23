import { pageMetadata } from "@/lib/i18n/server";
import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { InfoPage, InfoSection } from "@/components/pages/InfoPage";
import { UnsubscribeForm } from "@/components/pages/UnsubscribeForm";

export const generateMetadata = pageMetadata("Se désabonner — ArtSyde", undefined, undefined, { robots: { index: false } });

async function Form({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const t = (await searchParams).t;
  return <UnsubscribeForm token={(Array.isArray(t) ? t[0] : t) ?? ""} />;
}

/** Where the "Se désabonner" link of each newsletter leads. */
export default function Page({ searchParams }: PageProps<"/[lang]/desabonnement">) {
  return (
    <PageShell>
      <InfoPage eyebrow="Newsletter" title="Se désabonner." muted="En un clic." lead="Tu ne recevras plus nos nouveautés, promotions et annonces par e-mail." current="/desabonnement">
        <InfoSection title="Confirmer">
          <Suspense fallback={null}>
            <Form searchParams={searchParams} />
          </Suspense>
        </InfoSection>
      </InfoPage>
    </PageShell>
  );
}
