import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { InfoPage, InfoSection } from "@/components/pages/InfoPage";
import { COMPANY, LEGAL_UPDATED, filled } from "@/lib/company";

export const metadata: Metadata = { title: "Mentions légales — ArtSyde" };

export default function Page() {
  // Only the details that are filled in (src/lib/company.ts) are shown.
  const publisher = [
    ["Nom commercial", COMPANY.brand],
    ["Raison sociale", COMPANY.legalName],
    ["RCCM", COMPANY.rccm],
    ["Compte contribuable", COMPANY.taxId],
    ["Siège et atelier", filled(COMPANY.address) ? `${COMPANY.address}, ${COMPANY.city}, ${COMPANY.country}` : `${COMPANY.city}, ${COMPANY.country}`],
    ["E-mail", COMPANY.email],
    ["Téléphone", COMPANY.phone],
    ["Directeur de la publication", COMPANY.publisher],
  ].filter(([, v]) => filled(v));

  return (
    <PageShell>
      <InfoPage eyebrow="Informations légales" title="Mentions légales." current="/mentions-legales" updated={LEGAL_UPDATED}>
        <InfoSection title="Éditeur du site">
          <ul>
            {publisher.map(([label, value]) => (
              <li key={label}>
                {label} : <b>{value}</b>
              </li>
            ))}
          </ul>
          <p>
            Pour nous joindre : la page <Link href="/contact">Contact</Link>.
          </p>
        </InfoSection>

        {filled(COMPANY.host) && (
          <InfoSection title="Hébergement">
            <p>{COMPANY.host}</p>
          </InfoSection>
        )}

        <InfoSection title="Propriété intellectuelle">
          <p>
            Les textes, visuels, logos, photos et modèles de t-shirts du site appartiennent à {COMPANY.brand} ou sont utilisés avec l&apos;accord de leurs auteurs. Toute reproduction sans autorisation est interdite.
          </p>
          <p>
            Le modèle 3D du t-shirt est « Oversized t-shirt » de kylelhb (Sketchfab), sous licence{" "}
            <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">
              CC BY 4.0
            </a>
            .
          </p>
          <p>
            Les images et textes que tu importes dans le studio restent les tiens : voir les <Link href="/conditions-d-utilisation">conditions d&apos;utilisation</Link>.
          </p>
        </InfoSection>

        <InfoSection title="Données personnelles">
          <p>
            Ce que nous collectons, pourquoi, et comment exercer tes droits : voir la partie « Données personnelles » des <Link href="/conditions-d-utilisation">conditions d&apos;utilisation</Link>.
          </p>
        </InfoSection>
      </InfoPage>
    </PageShell>
  );
}
