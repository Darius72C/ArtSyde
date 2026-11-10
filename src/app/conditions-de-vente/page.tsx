import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { Fact, InfoPage, InfoSection } from "@/components/pages/InfoPage";
import { COMPANY, LEGAL_UPDATED, filled } from "@/lib/company";
import { PAYMENT_METHODS, PAYMENT_METHOD_IDS } from "@/lib/credits";
import { DELIVERY, DELIVERY_METHODS } from "@/lib/orders";
import { formatFCFA } from "@/lib/products";

export const metadata: Metadata = { title: "Conditions générales de vente — ArtSyde" };

const methods = PAYMENT_METHOD_IDS.map((k) => PAYMENT_METHODS[k]).join(", ");

export default function Page() {
  return (
    <PageShell>
      <InfoPage
        eyebrow="Informations légales"
        title="Conditions générales de vente."
        lead={`Elles s'appliquent à toute commande passée sur le site ${COMPANY.brand} : t-shirts de la boutique, créations du studio 3D et crédits du studio.`}
        current="/conditions-de-vente"
        updated={LEGAL_UPDATED}
      >
        <InfoSection title="1. Le vendeur">
          <p>
            Les ventes sont conclues avec <Fact value={COMPANY.legalName} fallback={COMPANY.brand} />
            {filled(COMPANY.rccm) && <>, RCCM {COMPANY.rccm}</>}, dont l&apos;atelier se trouve à {filled(COMPANY.address) ? `${COMPANY.address}, ${COMPANY.city}` : COMPANY.city}, {COMPANY.country}. Pour nous joindre : <Fact value={COMPANY.email} fallback={<Link href="/contact">la page Contact</Link>} />.
          </p>
        </InfoSection>

        <InfoSection title="2. Les produits">
          <p>Nous vendons des t-shirts imprimés à la commande dans notre atelier : les modèles de la boutique, et les créations que tu fais dans le studio 3D.</p>
          <p>Les photos et la vue 3D sont aussi fidèles que possible, mais les couleurs peuvent légèrement différer selon ton écran et la matière. La disponibilité d&apos;une couleur et d&apos;une taille dépend de notre stock de t-shirts vierges ; une taille épuisée ne peut pas être commandée.</p>
        </InfoSection>

        <InfoSection title="3. Prix">
          <p>Les prix sont indiqués en francs CFA (FCFA), toutes taxes comprises. Les frais de livraison s&apos;ajoutent selon le mode choisi :</p>
          <ul>
            {DELIVERY_METHODS.map((d) => (
              <li key={d}>
                {DELIVERY[d].label} ({DELIVERY[d].note}) : {DELIVERY[d].price ? formatFCFA(DELIVERY[d].price) : "gratuit"}
              </li>
            ))}
          </ul>
          <p>Le prix appliqué est celui affiché au moment de la commande. En paiement en ligne, les frais de l&apos;opérateur choisi s&apos;ajoutent et restent à ta charge : leur montant est indiqué avant que tu paies.</p>
        </InfoSection>

        <InfoSection title="4. Commande">
          <p>Tu choisis tes articles, ta taille et ton mode de livraison, puis tu indiques tes coordonnées. Ta commande reçoit une référence (par exemple AS-7KP3-QX9M) et un lien de suivi ; elle est enregistrée « en attente de paiement ».</p>
          <p>La vente est conclue quand nous avons reçu ton paiement. Nous pouvons refuser ou annuler une commande en cas de paiement non reçu, d&apos;informations manifestement fausses, ou d&apos;une création du studio qui ne respecte pas nos <Link href="/conditions-d-utilisation">conditions d&apos;utilisation</Link> ; dans ce cas, tout montant reçu est remboursé.</p>
        </InfoSection>

        <InfoSection title="5. Paiement">
          <p>Le paiement se fait par {methods}. Après ta commande, nous t&apos;envoyons une demande de paiement sur le numéro indiqué. Ta commande n&apos;est imprimée qu&apos;après réception du paiement.</p>
        </InfoSection>

        <InfoSection title="6. Créations du studio">
          <ul>
            <li>Tu imprimes ce que tu as placé dans le studio : vérifie bien ton design (orthographe, position, couleurs) avant de commander. La vue 3D et le fichier d&apos;impression montrent le résultat.</li>
            <li>Une image trop petite peut être floue une fois imprimée ; le studio t&apos;avertit, mais le choix final t&apos;appartient.</li>
            <li>Tu dois avoir le droit d&apos;utiliser les images et textes que tu importes (voir les conditions d&apos;utilisation).</li>
            <li>Une création personnalisée est faite pour toi : elle n&apos;est ni reprise ni échangée, sauf défaut de notre part (article 9).</li>
          </ul>
        </InfoSection>

        <InfoSection title="7. Fabrication et livraison">
          <p>
            Chaque pièce est imprimée après paiement. Les délais de livraison indiqués courent à partir de l&apos;expédition ; le détail est sur la page <Link href="/livraison">Livraison</Link>. En retrait à l&apos;atelier, tu es prévenu quand ta commande est prête. Un retard ne donne pas lieu à indemnité, mais tu peux annuler une commande pas encore expédiée si le délai annoncé est largement dépassé.
          </p>
        </InfoSection>

        <InfoSection title="8. Retours et échanges (modèles de la boutique)">
          <p>Tu peux échanger ou retourner un t-shirt de la boutique dans les <b>7 jours</b> après sa réception, s&apos;il n&apos;a été ni porté ni lavé et qu&apos;il est dans son état d&apos;origine. Écris-nous avec ta référence ; les frais de retour sont à ta charge, sauf erreur de notre part. Le remboursement se fait sur le moyen de paiement utilisé, sous 14 jours après réception du retour.</p>
        </InfoSection>

        <InfoSection title="9. Défauts et erreurs">
          <p>Un t-shirt abîmé, mal imprimé ou différent de ta commande ? Écris-nous dans les <b>7 jours</b> suivant la réception, avec ta référence et une photo. Après vérification, nous le réimprimons sans frais ou te remboursons, frais de livraison compris.</p>
        </InfoSection>

        <InfoSection title="10. Crédits du studio">
          <ul>
            <li>Les crédits servent aux fonctions payantes du studio : importer une image, télécharger ou commander en HD et Ultra HD. Tourner le t-shirt, choisir les couleurs et télécharger l&apos;aperçu Standard sont gratuits.</li>
            <li>Un pack acheté est crédité sur ton compte quand le paiement est reçu.</li>
            <li>Les crédits sont personnels, n&apos;ont pas de valeur en argent et ne sont ni remboursables ni transférables, sauf erreur de notre part. Un crédit utilisé pour un téléchargement qui échoue est rendu automatiquement.</li>
          </ul>
        </InfoSection>

        <InfoSection title="11. Réclamations et litiges">
          <p>
            Pour toute réclamation, écris-nous (<Fact value={COMPANY.email} fallback={<Link href="/contact">page Contact</Link>} />). Nous cherchons d&apos;abord une solution amiable. Ces conditions sont soumises au droit ivoirien ; à défaut d&apos;accord, le litige relève des tribunaux compétents d&apos;{COMPANY.city}.
          </p>
        </InfoSection>
      </InfoPage>
    </PageShell>
  );
}
