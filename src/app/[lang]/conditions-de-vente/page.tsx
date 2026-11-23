import { getLocale, pageMetadata } from "@/lib/i18n/server";
import { makeT } from "@/lib/i18n";
import { FrenchPrevails } from "@/components/pages/FrenchPrevails";
import Link from "@/components/LocaleLink";
import { PageShell } from "@/components/PageShell";
import { Fact, InfoPage, InfoSection } from "@/components/pages/InfoPage";
import { COMPANY, LEGAL_UPDATED, filled } from "@/lib/company";
import { PAYMENT_METHODS, PAYMENT_METHOD_IDS } from "@/lib/credits";
import { DELIVERY, DELIVERY_METHODS } from "@/lib/orders";
import { formatFCFA } from "@/lib/products";

export const generateMetadata = pageMetadata("Conditions générales de vente — ArtSyde", "/conditions-de-vente");

const methods = PAYMENT_METHOD_IDS.map((k) => PAYMENT_METHODS[k]).join(", ");

export default async function Page() {
  if ((await getLocale()) === "en") return <English />;
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

/** The terms in English (the French text above prevails). */
function English() {
  const t = makeT("en");
  const where = filled(COMPANY.address) ? `${COMPANY.address}, ${COMPANY.city}` : COMPANY.city;
  return (
    <PageShell>
      <InfoPage
        eyebrow="Legal information"
        title="Terms and conditions of sale."
        lead={`They apply to every order placed on the ${COMPANY.brand} site: shop t-shirts, 3D studio creations and studio credits.`}
        current="/conditions-de-vente"
        updated={LEGAL_UPDATED}
      >
        <FrenchPrevails />
        <InfoSection title="1. The seller">
          <p>
            Sales are made with <Fact value={COMPANY.legalName} fallback={COMPANY.brand} />
            {filled(COMPANY.rccm) && <>, RCCM {COMPANY.rccm}</>}, whose workshop is located at {where}, {COMPANY.country}. To reach us: <Fact value={COMPANY.email} fallback={<Link href="/contact">the Contact page</Link>} />.
          </p>
        </InfoSection>

        <InfoSection title="2. The products">
          <p>We sell t-shirts printed to order in our workshop: the designs in the shop, and the creations you make in the 3D studio.</p>
          <p>Photos and the 3D view are as faithful as possible, but colours may differ slightly depending on your screen and the fabric. Whether a colour and size are available depends on our stock of blank t-shirts; a sold-out size can&apos;t be ordered.</p>
        </InfoSection>

        <InfoSection title="3. Prices">
          <p>Prices are shown in CFA francs (FCFA), all taxes included. Delivery costs are added according to the option chosen:</p>
          <ul>
            {DELIVERY_METHODS.map((d) => (
              <li key={d}>
                {t(DELIVERY[d].label)} ({t(DELIVERY[d].note)}): {DELIVERY[d].price ? formatFCFA(DELIVERY[d].price) : "free"}
              </li>
            ))}
          </ul>
          <p>The price applied is the one shown when you order. With online payment, the chosen operator&apos;s fee is added and is paid by you: its amount is shown before you pay.</p>
        </InfoSection>

        <InfoSection title="4. Ordering">
          <p>You choose your items, size and delivery option, then enter your details. Your order gets a reference (for example AS-7KP3-QX9M) and a tracking link; it is saved as &ldquo;awaiting payment&rdquo;.</p>
          <p>The sale is concluded once we have received your payment. We may refuse or cancel an order if payment isn&apos;t received, if the information is clearly false, or if a studio creation doesn&apos;t comply with our <Link href="/conditions-d-utilisation">terms of use</Link>; in that case, any amount received is refunded.</p>
        </InfoSection>

        <InfoSection title="5. Payment">
          <p>Payment is made by {PAYMENT_METHOD_IDS.map((k) => t(PAYMENT_METHODS[k])).join(", ")}. After your order, we send you a payment request on the number given. Your order is only printed once the payment has been received.</p>
        </InfoSection>

        <InfoSection title="6. Studio creations">
          <ul>
            <li>We print what you placed in the studio: check your design carefully (spelling, position, colours) before ordering. The 3D view and the print file show the result.</li>
            <li>An image that&apos;s too small may print blurry; the studio warns you, but the final choice is yours.</li>
            <li>You must have the right to use the images and texts you upload (see the terms of use).</li>
            <li>A custom creation is made for you: it can&apos;t be returned or exchanged, except for a defect on our side (section 9).</li>
          </ul>
        </InfoSection>

        <InfoSection title="7. Production and delivery">
          <p>
            Each piece is printed after payment. The delivery times shown run from dispatch; the details are on the <Link href="/livraison">Delivery</Link> page. With pickup at the workshop, you&apos;re told when your order is ready. A delay gives no right to compensation, but you can cancel an order that hasn&apos;t shipped yet if the announced time is largely exceeded.
          </p>
        </InfoSection>

        <InfoSection title="8. Returns and exchanges (shop designs)">
          <p>You can exchange or return a shop t-shirt within <b>7 days</b> of receiving it, if it hasn&apos;t been worn or washed and is in its original condition. Write to us with your reference; return costs are yours, unless we made a mistake. Refunds go to the payment method used, within 14 days of receiving the return.</p>
        </InfoSection>

        <InfoSection title="9. Defects and mistakes">
          <p>A t-shirt that&apos;s damaged, badly printed or different from your order? Write to us within <b>7 days</b> of receiving it, with your reference and a photo. After checking, we reprint it free of charge or refund you, delivery included.</p>
        </InfoSection>

        <InfoSection title="10. Studio credits">
          <ul>
            <li>Credits are for the studio&apos;s paid features: uploading an image, downloading or ordering in HD and Ultra HD. Spinning the t-shirt, choosing colours and downloading the Standard preview are free.</li>
            <li>A pack you buy is credited to your account once the payment is received.</li>
            <li>Credits are personal, have no cash value and can&apos;t be refunded or transferred, except for a mistake on our side. A credit used for a download that fails is given back automatically.</li>
          </ul>
        </InfoSection>

        <InfoSection title="11. Complaints and disputes">
          <p>
            For any complaint, write to us (<Fact value={COMPANY.email} fallback={<Link href="/contact">Contact page</Link>} />). We first look for an amicable solution. These terms are governed by Ivorian law; failing agreement, disputes fall under the competent courts of {COMPANY.city}.
          </p>
        </InfoSection>
      </InfoPage>
    </PageShell>
  );
}
