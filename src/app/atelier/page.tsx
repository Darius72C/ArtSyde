import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { InfoPage, InfoSection } from "@/components/pages/InfoPage";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = { title: "L'atelier — ArtSyde", description: "Des t-shirts imprimés à la commande dans notre atelier." };

export default function Page() {
  return (
    <PageShell>
      <InfoPage eyebrow="ArtSyde" title="L'atelier." muted={`Tout est fait à ${COMPANY.city}.`} lead="ArtSyde imprime ses t-shirts lui-même, à la commande : un modèle de la boutique ou ta propre création, pièce par pièce." current="/atelier">
        <InfoSection title="Ce qu'on fait">
          <p>
            Des t-shirts <b>oversize</b>, coupe ample et épaules tombantes, dans un coton épais et souple. On les imprime nous-mêmes, on les contrôle et on les plie avant de les envoyer.
          </p>
          <p>
            Tu peux choisir un modèle de la <Link href="/#boutique">boutique</Link>, ou créer le tien dans le <Link href="/studio">studio 3D</Link> : ton image ou ton texte sur tout le devant et tout le dos, vu en 3D avant d&apos;être imprimé.
          </p>
        </InfoSection>

        <InfoSection title="Comment on imprime">
          <ul>
            <li>
              <b>Impression DTF</b>, dès une seule pièce : des couleurs vives, des détails fins, idéal pour une création unique.
            </li>
            <li>
              <b>Sérigraphie</b>, dès 20 pièces : un rendu net et très durable, et un meilleur prix pour les équipes, associations et événements.
            </li>
          </ul>
        </InfoSection>

        <InfoSection title="À la commande">
          <p>
            Rien n&apos;est imprimé d&apos;avance : chaque pièce est lancée quand sa commande est payée. Moins de stock perdu, et chaque t-shirt part exactement comme tu l&apos;as choisi. Les délais sont sur la page <Link href="/livraison">Livraison</Link>.
          </p>
        </InfoSection>
      </InfoPage>
    </PageShell>
  );
}
