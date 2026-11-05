import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { InfoPage, InfoSection } from "@/components/pages/InfoPage";
import { TrackForm } from "@/components/pages/TrackForm";

export const metadata: Metadata = { title: "Suivi de commande — ArtSyde", description: "Retrouve ta commande avec sa référence." };

export default function Page() {
  return (
    <PageShell>
      <InfoPage eyebrow="Aide" title="Suivi de commande." muted="Où en est ton t-shirt." lead="Entre la référence reçue à la commande (elle commence par AS-) et le numéro de téléphone que tu as donné." current="/suivi">
        <InfoSection title="Retrouver ma commande">
          <TrackForm />
        </InfoSection>
        <InfoSection title="Avec un compte">
          <p>
            Connecté, tu retrouves toutes tes commandes dans <Link href="/compte">ton compte</Link>, sans référence à taper.
          </p>
        </InfoSection>
      </InfoPage>
    </PageShell>
  );
}
