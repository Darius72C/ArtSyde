import { getLocale, pageMetadata } from "@/lib/i18n/server";
import { makeT } from "@/lib/i18n";
import { PageShell } from "@/components/PageShell";
import { InfoPage, InfoSection } from "@/components/pages/InfoPage";
import { SIZE_GUIDE, SIZE_GUIDE_CONFIRMED } from "@/lib/company";

export const generateMetadata = pageMetadata("Guide des tailles — ArtSyde", "/guide-des-tailles", "Mesures du t-shirt oversize ArtSyde, de XS à XXL.");

const th = "border-b border-line pb-3 pr-6 text-left text-sm font-normal text-muted last:pr-0";
const td = "border-b border-line py-3 pr-6 tabular-nums last:pr-0";

export default async function Page() {
  const locale = await getLocale();
  const t = makeT(locale);
  const en = locale === "en";
  return (
    <PageShell>
      <InfoPage eyebrow="Aide" title="Guide des tailles." muted="Coupe oversize." lead="Nos t-shirts sont coupés amples, avec les épaules tombantes. Prends ta taille habituelle pour l'effet oversize, une taille en dessous pour un tombé plus près du corps." current="/guide-des-tailles">
        <InfoSection title="Mesures du t-shirt">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-[16px] text-ink">
              <thead>
                <tr>
                  <th className={th}>{t("Taille")}</th>
                  <th className={th}>{t("Largeur (cm)")}</th>
                  <th className={th}>{t("Longueur (cm)")}</th>
                  <th className={th}>{t("Manche (cm)")}</th>
                </tr>
              </thead>
              <tbody>
                {SIZE_GUIDE.map((r) => (
                  <tr key={r.size}>
                    <td className={`${td} font-semibold`}>{r.size}</td>
                    <td className={td}>{r.chest}</td>
                    <td className={td}>{r.length}</td>
                    <td className={td}>{r.sleeve}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm">{t("Mesures prises à plat, à 1 ou 2 cm près.")}{SIZE_GUIDE_CONFIRMED ? "" : ` ${t("Mesures indicatives.")}`}</p>
        </InfoSection>

        <InfoSection title="Comment mesurer">
          {en ? (
            <>
              <ul>
                <li>
                  <b>Width</b>: lay a t-shirt that fits you well flat and measure from one armpit to the other.
                </li>
                <li>
                  <b>Length</b>: from the top of the shoulder, next to the collar, down to the hem.
                </li>
                <li>
                  <b>Sleeve</b>: from the shoulder seam to the edge of the sleeve.
                </li>
              </ul>
              <p>Compare with the table: if you&apos;re between two sizes, take the bigger one to keep the oversized look.</p>
            </>
          ) : (
            <>
              <ul>
                <li>
                  <b>Largeur</b> : pose un t-shirt qui te va bien à plat et mesure d&apos;une aisselle à l&apos;autre.
                </li>
                <li>
                  <b>Longueur</b> : du haut de l&apos;épaule, près du col, jusqu&apos;en bas du t-shirt.
                </li>
                <li>
                  <b>Manche</b> : de la couture de l&apos;épaule jusqu&apos;au bord de la manche.
                </li>
              </ul>
              <p>Compare avec le tableau : si tu hésites entre deux tailles, prends la plus grande pour garder l&apos;effet oversize.</p>
            </>
          )}
        </InfoSection>

        <InfoSection title="Lavage">
          <p>{en ? "Wash at 30 °C, inside out, and air dry. Don't iron directly on the print: turn the t-shirt inside out. That way the print keeps its colours wash after wash." : "Lave à 30 °C, sur l'envers, et sèche à l'air libre. Ne repasse pas directement sur l'impression : retourne le t-shirt. L'impression garde ainsi ses couleurs lavage après lavage."}</p>
        </InfoSection>
      </InfoPage>
    </PageShell>
  );
}
