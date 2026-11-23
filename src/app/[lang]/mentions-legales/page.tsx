import { getLocale, pageMetadata } from "@/lib/i18n/server";
import { makeT } from "@/lib/i18n";
import { FrenchPrevails } from "@/components/pages/FrenchPrevails";
import Link from "@/components/LocaleLink";
import { PageShell } from "@/components/PageShell";
import { InfoPage, InfoSection } from "@/components/pages/InfoPage";
import { COMPANY, LEGAL_UPDATED, filled } from "@/lib/company";

export const generateMetadata = pageMetadata("Mentions légales — ArtSyde", "/mentions-legales");

export default async function Page() {
  const locale = await getLocale();
  const t = makeT(locale);
  const en = locale === "en";
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
        <FrenchPrevails />
        <InfoSection title="Éditeur du site">
          <ul>
            {publisher.map(([label, value]) => (
              <li key={label}>
                {t(label)} : <b>{value}</b>
              </li>
            ))}
          </ul>
          <p>
            {t("Pour nous joindre : la page")} <Link href="/contact">{t("Contact")}</Link>.
          </p>
        </InfoSection>

        {filled(COMPANY.host) && (
          <InfoSection title="Hébergement">
            <p>{COMPANY.host}</p>
          </InfoSection>
        )}

        <InfoSection title="Propriété intellectuelle">
          <p>{t("Les textes, visuels, logos, photos et modèles de t-shirts du site appartiennent à {brand} ou sont utilisés avec l'accord de leurs auteurs. Toute reproduction sans autorisation est interdite.", { brand: COMPANY.brand })}</p>
          <p>
            {t("Le modèle 3D du t-shirt est « Oversized t-shirt » de kylelhb (Sketchfab), sous licence")}{" "}
            <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">
              CC BY 4.0
            </a>
            .
          </p>
          <p>
            {t("Les images et textes que tu importes dans le studio restent les tiens : voir les")} <Link href="/conditions-d-utilisation">{t("conditions d'utilisation")}</Link>.
          </p>
        </InfoSection>

        <InfoSection title="Données personnelles">
          <p>
            {en ? "What we collect, why, and how to exercise your rights: see the “Personal data” part of the" : "Ce que nous collectons, pourquoi, et comment exercer tes droits : voir la partie « Données personnelles » des"} <Link href="/conditions-d-utilisation">{t("conditions d'utilisation")}</Link>.
          </p>
        </InfoSection>
      </InfoPage>
    </PageShell>
  );
}
