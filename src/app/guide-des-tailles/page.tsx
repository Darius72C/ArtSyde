import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { InfoPage, InfoSection } from "@/components/pages/InfoPage";
import { SIZE_GUIDE, SIZE_GUIDE_CONFIRMED } from "@/lib/company";

export const metadata: Metadata = { title: "Guide des tailles — ArtSyde", description: "Mesures du t-shirt oversize ArtSyde, de XS à XXL." };

const th = "border-b border-line pb-3 pr-6 text-left text-sm font-normal text-muted last:pr-0";
const td = "border-b border-line py-3 pr-6 tabular-nums last:pr-0";

export default function Page() {
  return (
    <PageShell>
      <InfoPage eyebrow="Aide" title="Guide des tailles." muted="Coupe oversize." lead="Nos t-shirts sont coupés amples, avec les épaules tombantes. Prends ta taille habituelle pour l'effet oversize, une taille en dessous pour un tombé plus près du corps." current="/guide-des-tailles">
        <InfoSection title="Mesures du t-shirt">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-[16px] text-ink">
              <thead>
                <tr>
                  <th className={th}>Taille</th>
                  <th className={th}>Largeur (cm)</th>
                  <th className={th}>Longueur (cm)</th>
                  <th className={th}>Manche (cm)</th>
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
          <p className="text-sm">Mesures prises à plat, à 1 ou 2 cm près.{SIZE_GUIDE_CONFIRMED ? "" : " Mesures indicatives."}</p>
        </InfoSection>

        <InfoSection title="Comment mesurer">
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
        </InfoSection>

        <InfoSection title="Lavage">
          <p>Lave à 30 °C, sur l&apos;envers, et sèche à l&apos;air libre. Ne repasse pas directement sur l&apos;impression : retourne le t-shirt. L&apos;impression garde ainsi ses couleurs lavage après lavage.</p>
        </InfoSection>
      </InfoPage>
    </PageShell>
  );
}
