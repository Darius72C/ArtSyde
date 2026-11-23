import { getLocale, pageMetadata } from "@/lib/i18n/server";
import { makeT } from "@/lib/i18n";
import Link from "@/components/LocaleLink";
import { PageShell } from "@/components/PageShell";
import { InfoPage, InfoSection } from "@/components/pages/InfoPage";
import { COMPANY, filled } from "@/lib/company";
import { DELIVERY, DELIVERY_METHODS } from "@/lib/orders";
import { formatFCFA } from "@/lib/products";

export const generateMetadata = pageMetadata("Livraison — ArtSyde", "/livraison", "Modes et délais de livraison, retrait à l'atelier.");

export default async function Page() {
  const locale = await getLocale();
  const t = makeT(locale);
  const en = locale === "en";
  return (
    <PageShell>
      <InfoPage eyebrow="Aide" title="Livraison." muted="Chez toi ou à l'atelier." lead="Chaque t-shirt est imprimé à la commande dans notre atelier, puis livré à l'adresse que tu indiques, ou mis de côté pour que tu viennes le chercher." current="/livraison">
        <InfoSection title="Modes et tarifs">
          <ul className="!list-none !pl-0">
            {DELIVERY_METHODS.map((d) => (
              <li key={d} className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-b border-line pb-3 !pl-0">
                <span>
                  <b>{t(DELIVERY[d].label)}</b> · {t(DELIVERY[d].note)}
                </span>
                <span className="tabular-nums text-ink">{DELIVERY[d].price ? formatFCFA(DELIVERY[d].price) : t("Gratuit")}</span>
              </li>
            ))}
          </ul>
          <p>{en ? "Delivery is charged once per order, whatever the number of items." : "Les frais de livraison s'ajoutent une fois par commande, quel que soit le nombre d'articles."}</p>
        </InfoSection>

        <InfoSection title="Quand ta commande part">
          {en ? (
            <>
              <p>The delivery time starts once your order is <b>paid</b> and printed. Shop designs are usually printed within 1 to 2 working days; a studio creation can take one more day, to prepare the print file.</p>
              <p>You can follow every step (paid, printing, out for delivery, delivered) on your order&apos;s page, from the link you got when ordering, your account or the <Link href="/suivi">Order tracking</Link> page.</p>
            </>
          ) : (
            <>
              <p>Le délai de livraison commence quand ta commande est <b>payée</b> et imprimée. Les modèles de la boutique sont imprimés en général sous 1 à 2 jours ouvrés ; une création du studio peut demander un jour de plus, le temps de préparer le fichier d&apos;impression.</p>
              <p>Tu suis chaque étape (payée, en impression, en livraison, livrée) sur la page de ta commande, depuis le lien reçu à la commande, ton compte ou la page <Link href="/suivi">Suivi de commande</Link>.</p>
            </>
          )}
        </InfoSection>

        <InfoSection title="Retrait à l'atelier">
          <p>{en ? "Free. When your order is ready, its tracking switches to “Ready at the workshop” and you can come and collect it with your order reference." : "Gratuit. Quand ta commande est prête, son suivi passe à « Prête à l'atelier » et tu peux venir la chercher avec ta référence de commande."}</p>
          {(filled(COMPANY.address) || filled(COMPANY.hours)) && (
            <ul>
              {filled(COMPANY.address) && (
                <li>
                  {t("Adresse :")} {COMPANY.address}, {COMPANY.city}
                </li>
              )}
              {filled(COMPANY.hours) && <li>{t("Horaires :")} {COMPANY.hours}</li>}
            </ul>
          )}
        </InfoSection>

        <InfoSection title="À la réception">
          {en ? (
            <p>Check your parcel when it arrives. A t-shirt that&apos;s damaged, badly printed or not what you ordered? Write to us within 7 days with your reference and a photo: we&apos;ll reprint it or refund you. The details are in our <Link href="/conditions-de-vente">terms of sale</Link>.</p>
          ) : (
            <p>Vérifie ton colis à l&apos;arrivée. Un t-shirt abîmé, mal imprimé ou qui ne correspond pas à ta commande ? Écris-nous dans les 7 jours avec ta référence et une photo : on le réimprime ou on te rembourse. Le détail est dans nos <Link href="/conditions-de-vente">conditions de vente</Link>.</p>
          )}
        </InfoSection>
      </InfoPage>
    </PageShell>
  );
}
