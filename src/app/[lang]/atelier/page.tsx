import { getLocale, pageMetadata } from "@/lib/i18n/server";
import { makeT } from "@/lib/i18n";
import Link from "@/components/LocaleLink";
import { PageShell } from "@/components/PageShell";
import { InfoPage, InfoSection } from "@/components/pages/InfoPage";
import { COMPANY } from "@/lib/company";

export const generateMetadata = pageMetadata("L'atelier — ArtSyde", "/atelier", "Des t-shirts imprimés à la commande dans notre atelier.");

export default async function Page() {
  const locale = await getLocale();
  const t = makeT(locale);
  const en = locale === "en";
  return (
    <PageShell>
      <InfoPage eyebrow="ArtSyde" title="L'atelier." muted={t("Tout est fait à {city}.", { city: COMPANY.city })} lead="ArtSyde imprime ses t-shirts lui-même, à la commande : un modèle de la boutique ou ta propre création, pièce par pièce." current="/atelier">
        <InfoSection title="Ce qu'on fait">
          {en ? (
            <>
              <p>
                <b>Oversized</b> t-shirts, with a relaxed fit and dropped shoulders, in thick, soft cotton. We print them ourselves, check them and fold them before sending them out.
              </p>
              <p>
                You can pick a design from the <Link href="/#boutique">shop</Link>, or create your own in the <Link href="/studio">3D studio</Link>: your image or text across the whole front and back, seen in 3D before it&apos;s printed.
              </p>
            </>
          ) : (
            <>
              <p>
                Des t-shirts <b>oversize</b>, coupe ample et épaules tombantes, dans un coton épais et souple. On les imprime nous-mêmes, on les contrôle et on les plie avant de les envoyer.
              </p>
              <p>
                Tu peux choisir un modèle de la <Link href="/#boutique">boutique</Link>, ou créer le tien dans le <Link href="/studio">studio 3D</Link> : ton image ou ton texte sur tout le devant et tout le dos, vu en 3D avant d&apos;être imprimé.
              </p>
            </>
          )}
        </InfoSection>

        <InfoSection title="Comment on imprime">
          <ul>
            <li>
              <b>{en ? "DTF printing" : "Impression DTF"}</b>{en ? ", from a single piece: vivid colours and fine detail, ideal for a one-off creation." : ", dès une seule pièce : des couleurs vives, des détails fins, idéal pour une création unique."}
            </li>
            <li>
              <b>{en ? "Screen printing" : "Sérigraphie"}</b>{en ? ", from 20 pieces: a sharp, very durable finish, and a better price for teams, clubs and events." : ", dès 20 pièces : un rendu net et très durable, et un meilleur prix pour les équipes, associations et événements."}
            </li>
          </ul>
        </InfoSection>

        <InfoSection title="À la commande">
          {en ? (
            <p>
              Nothing is printed in advance: each piece is started when its order is paid. Less wasted stock, and every t-shirt leaves exactly as you chose it. Delivery times are on the <Link href="/livraison">Delivery</Link> page.
            </p>
          ) : (
            <p>
              Rien n&apos;est imprimé d&apos;avance : chaque pièce est lancée quand sa commande est payée. Moins de stock perdu, et chaque t-shirt part exactement comme tu l&apos;as choisi. Les délais sont sur la page <Link href="/livraison">Livraison</Link>.
            </p>
          )}
        </InfoSection>
      </InfoPage>
    </PageShell>
  );
}
