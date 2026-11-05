import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { InfoPage, InfoSection } from "@/components/pages/InfoPage";
import { COMPANY, filled } from "@/lib/company";
import { DELIVERY, DELIVERY_METHODS } from "@/lib/orders";
import { formatFCFA } from "@/lib/products";

export const metadata: Metadata = { title: "Livraison — ArtSyde", description: "Modes et délais de livraison, retrait à l'atelier." };

export default function Page() {
  return (
    <PageShell>
      <InfoPage eyebrow="Aide" title="Livraison." muted="Chez toi ou à l'atelier." lead="Chaque t-shirt est imprimé à la commande dans notre atelier, puis livré à l'adresse que tu indiques, ou mis de côté pour que tu viennes le chercher." current="/livraison">
        <InfoSection title="Modes et tarifs">
          <ul className="!list-none !pl-0">
            {DELIVERY_METHODS.map((d) => (
              <li key={d} className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-b border-line pb-3 !pl-0">
                <span>
                  <b>{DELIVERY[d].label}</b> · {DELIVERY[d].note}
                </span>
                <span className="tabular-nums text-ink">{DELIVERY[d].price ? formatFCFA(DELIVERY[d].price) : "Gratuit"}</span>
              </li>
            ))}
          </ul>
          <p>Les frais de livraison s&apos;ajoutent une fois par commande, quel que soit le nombre d&apos;articles.</p>
        </InfoSection>

        <InfoSection title="Quand ta commande part">
          <p>Le délai de livraison commence quand ta commande est <b>payée</b> et imprimée. Les modèles de la boutique sont imprimés en général sous 1 à 2 jours ouvrés ; une création du studio peut demander un jour de plus, le temps de préparer le fichier d&apos;impression.</p>
          <p>Tu suis chaque étape (payée, en impression, en livraison, livrée) sur la page de ta commande, depuis le lien reçu à la commande, ton compte ou la page <Link href="/suivi">Suivi de commande</Link>.</p>
        </InfoSection>

        <InfoSection title="Retrait à l'atelier">
          <p>Gratuit. Quand ta commande est prête, son suivi passe à « Prête à l&apos;atelier » et tu peux venir la chercher avec ta référence de commande.</p>
          {(filled(COMPANY.address) || filled(COMPANY.hours)) && (
            <ul>
              {filled(COMPANY.address) && (
                <li>
                  Adresse : {COMPANY.address}, {COMPANY.city}
                </li>
              )}
              {filled(COMPANY.hours) && <li>Horaires : {COMPANY.hours}</li>}
            </ul>
          )}
        </InfoSection>

        <InfoSection title="À la réception">
          <p>Vérifie ton colis à l&apos;arrivée. Un t-shirt abîmé, mal imprimé ou qui ne correspond pas à ta commande ? Écris-nous dans les 7 jours avec ta référence et une photo : on le réimprime ou on te rembourse. Le détail est dans nos <Link href="/conditions-de-vente">conditions de vente</Link>.</p>
        </InfoSection>
      </InfoPage>
    </PageShell>
  );
}
