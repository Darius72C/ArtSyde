import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { Fact, InfoPage, InfoSection } from "@/components/pages/InfoPage";
import { COMPANY, LEGAL_UPDATED } from "@/lib/company";

export const metadata: Metadata = { title: "Mentions légales — ArtSyde" };

export default function Page() {
  return (
    <PageShell>
      <InfoPage eyebrow="Informations légales" title="Mentions légales." current="/mentions-legales" updated={LEGAL_UPDATED}>
        <InfoSection title="Éditeur du site">
          <ul>
            <li>
              Nom commercial : <b>{COMPANY.brand}</b>
            </li>
            <li>
              Raison sociale : <Fact value={COMPANY.legalName} />
            </li>
            <li>
              RCCM : <Fact value={COMPANY.rccm} />
            </li>
            <li>
              Compte contribuable : <Fact value={COMPANY.taxId} />
            </li>
            <li>
              Siège et atelier : <Fact value={COMPANY.address} />, {COMPANY.city}, {COMPANY.country}
            </li>
            <li>
              Contact : <Fact value={COMPANY.email} /> · <Fact value={COMPANY.phone} />
            </li>
            <li>
              Directeur de la publication : <Fact value={COMPANY.publisher} />
            </li>
          </ul>
        </InfoSection>

        <InfoSection title="Hébergement">
          <ul>
            <li>
              Site : <Fact value={COMPANY.host} />
            </li>
            <li>Base de données : Neon, Inc. (PostgreSQL)</li>
            <li>Photos des produits et visuels : Cloudflare, Inc. (stockage R2)</li>
          </ul>
        </InfoSection>

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
          <p>Les images et textes que tu importes dans le studio restent les tiens : voir les <Link href="/conditions-d-utilisation">conditions d&apos;utilisation</Link>.</p>
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
