import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { Fact, InfoPage, InfoSection } from "@/components/pages/InfoPage";
import { COMPANY, filled } from "@/lib/company";

export const metadata: Metadata = { title: "Contact — ArtSyde", description: "Écrire ou passer à l'atelier ArtSyde." };

export default function Page() {
  return (
    <PageShell>
      <InfoPage eyebrow="Aide" title="Contact." muted="On te répond vite." lead="Une question sur une commande, un design ou une commande pour ton équipe ? Écris-nous : on répond en général dans la journée, les jours ouvrés." current="/contact">
        <InfoSection title="Nous écrire">
          <ul>
            <li>
              E-mail : {filled(COMPANY.email) ? <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> : <Fact value={COMPANY.email} />}
            </li>
            <li>
              Téléphone : {filled(COMPANY.phone) ? <a href={`tel:${COMPANY.phone.replace(/\s+/g, "")}`}>{COMPANY.phone}</a> : <Fact value={COMPANY.phone} />}
            </li>
            {COMPANY.whatsapp && (
              <li>
                WhatsApp :{" "}
                <a href={`https://wa.me/${COMPANY.whatsapp}`} target="_blank" rel="noopener noreferrer">
                  écrire sur WhatsApp
                </a>
              </li>
            )}
          </ul>
          <p>Pour une commande, donne-nous sa référence (AS-…) : on la retrouve tout de suite.</p>
        </InfoSection>

        <InfoSection title="L'atelier">
          <ul>
            <li>
              Adresse : <Fact value={COMPANY.address} />, {COMPANY.city}, {COMPANY.country}
            </li>
            <li>
              Horaires : <Fact value={COMPANY.hours} />
            </li>
          </ul>
        </InfoSection>

        <InfoSection title="Avant d'écrire">
          <ul>
            <li>
              Où en est ma commande ? <Link href="/suivi">Suivi de commande</Link>
            </li>
            <li>
              Délais et frais : <Link href="/livraison">Livraison</Link>
            </li>
            <li>
              Quelle taille choisir ? <Link href="/guide-des-tailles">Guide des tailles</Link>
            </li>
            <li>
              Commande pour une équipe ou une association : dès 20 pièces, on te fait un devis en sérigraphie.
            </li>
          </ul>
        </InfoSection>
      </InfoPage>
    </PageShell>
  );
}
