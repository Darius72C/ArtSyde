import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { InfoPage, InfoSection } from "@/components/pages/InfoPage";
import { COMPANY, filled } from "@/lib/company";
import { WhatsAppMark } from "@/components/WhatsAppButton";

export const metadata: Metadata = { title: "Contact — ArtSyde", description: "Écrire ou passer à l'atelier ArtSyde." };

export default function Page() {
  return (
    <PageShell>
      <InfoPage eyebrow="Aide" title="Contact." muted="On te répond vite." lead="Une question sur une commande, un design ou une commande pour ton équipe ? Le plus rapide : WhatsApp. On répond en général dans la journée, les jours ouvrés." current="/contact">
        <InfoSection title="Nous écrire">
          {COMPANY.whatsapp && (
            <a href={COMPANY.whatsapp} target="_blank" rel="noopener noreferrer" className="!inline-flex items-center gap-3 rounded-full bg-[#25D366] px-6 py-3 text-[15px] font-medium !text-white !no-underline transition-transform duration-300 hover:scale-[1.03] active:scale-95">
              <WhatsAppMark className="h-5 w-5" />
              Nous écrire sur WhatsApp
            </a>
          )}
          {!filled(COMPANY.email) && !filled(COMPANY.phone) && !COMPANY.whatsapp && <p>Nos coordonnées arrivent très bientôt sur cette page.</p>}
          <ul>
            {filled(COMPANY.email) && (
              <li>
                E-mail : <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
              </li>
            )}
            {filled(COMPANY.phone) && (
              <li>
                Téléphone : <a href={`tel:${COMPANY.phone.replace(/\s+/g, "")}`}>{COMPANY.phone}</a>
              </li>
            )}
          </ul>
          <p>Pour une commande, donne-nous sa référence (AS-…) : on la retrouve tout de suite.</p>
        </InfoSection>

        <InfoSection title="L'atelier">
          <ul>
            <li>
              {filled(COMPANY.address) ? `${COMPANY.address}, ` : "À "}
              {COMPANY.city}, {COMPANY.country}
            </li>
            {filled(COMPANY.hours) && <li>Horaires : {COMPANY.hours}</li>}
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
