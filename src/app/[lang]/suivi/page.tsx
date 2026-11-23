import { getT, pageMetadata } from "@/lib/i18n/server";
import Link from "@/components/LocaleLink";
import { PageShell } from "@/components/PageShell";
import { InfoPage, InfoSection } from "@/components/pages/InfoPage";
import { TrackForm } from "@/components/pages/TrackForm";

export const generateMetadata = pageMetadata("Suivi de commande — ArtSyde", "/suivi", "Retrouve ta commande avec sa référence.");

export default async function Page() {
  const t = await getT();
  return (
    <PageShell>
      <InfoPage eyebrow="Aide" title="Suivi de commande." muted="Où en est ton t-shirt." lead="Entre la référence reçue à la commande (elle commence par AS-) et le numéro de téléphone que tu as donné." current="/suivi">
        <InfoSection title="Retrouver ma commande">
          <TrackForm />
        </InfoSection>
        <InfoSection title="Avec un compte">
          <p>
            {t("Connecté, tu retrouves toutes tes commandes dans")} <Link href="/compte">{t("ton compte")}</Link>{t(", sans référence à taper.")}
          </p>
        </InfoSection>
      </InfoPage>
    </PageShell>
  );
}
