import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { Fact, InfoPage, InfoSection } from "@/components/pages/InfoPage";
import { COMPANY, LEGAL_UPDATED } from "@/lib/company";

export const metadata: Metadata = { title: "Conditions d'utilisation — ArtSyde" };

export default function Page() {
  return (
    <PageShell>
      <InfoPage
        eyebrow="Informations légales"
        title="Conditions d'utilisation."
        lead={`Les règles d'utilisation du site ${COMPANY.brand}, de ton compte et du studio 3D. En utilisant le site, tu les acceptes.`}
        current="/conditions-d-utilisation"
        updated={LEGAL_UPDATED}
      >
        <InfoSection title="1. Le site">
          <p>
            Le site est édité par <Fact value={COMPANY.legalName} fallback={COMPANY.brand} /> (voir les <Link href="/mentions-legales">mentions légales</Link>). Il permet de découvrir et commander nos t-shirts, de créer le tien dans le studio 3D et de gérer ton compte. Les achats suivent nos <Link href="/conditions-de-vente">conditions de vente</Link>.
          </p>
        </InfoSection>

        <InfoSection title="2. Ton compte">
          <ul>
            <li>Tu peux créer un compte avec Google ou avec ton e-mail et un mot de passe. Il est gratuit et réservé à une personne.</li>
            <li>Donne des informations exactes et garde ton mot de passe pour toi : ce qui est fait depuis ton compte est sous ta responsabilité. Préviens-nous si tu penses qu&apos;il a été utilisé par quelqu&apos;un d&apos;autre.</li>
            <li>À l&apos;inscription, des crédits du studio sont offerts une seule fois par personne. Créer plusieurs comptes pour en obtenir davantage est interdit.</li>
            <li>Tu peux fermer ton compte à tout moment en nous écrivant. Nous pouvons le suspendre en cas d&apos;abus ou de non-respect de ces conditions.</li>
          </ul>
        </InfoSection>

        <InfoSection title="3. Le studio 3D et tes créations">
          <ul>
            <li>
              Les images et textes que tu importes <b>restent les tiens</b>. En commandant, tu nous autorises seulement à les utiliser pour préparer et imprimer ta commande, et à les garder le temps nécessaire au suivi et aux éventuelles réclamations.
            </li>
            <li>Tu garantis avoir le droit de les utiliser : pas de logo, marque, personnage, photo ou œuvre d&apos;autrui sans son autorisation.</li>
            <li>
              Sont interdits : les contenus illégaux, haineux, violents, discriminatoires, à caractère sexuel, ou qui portent atteinte à la vie privée ou à l&apos;image d&apos;une personne. Nous pouvons refuser d&apos;imprimer une création qui ne respecte pas ces règles ; la commande est alors annulée et remboursée.
            </li>
            <li>Si un tiers nous réclame des droits sur une création que tu as importée, tu en restes responsable.</li>
          </ul>
        </InfoSection>

        <InfoSection title="4. Téléchargements et filigrane">
          <ul>
            <li>L&apos;aperçu Standard est gratuit, en petite taille et avec le filigrane {COMPANY.brand}. Les fichiers HD et Ultra HD s&apos;obtiennent avec des crédits.</li>
            <li>Il est interdit de retirer, masquer ou contourner le filigrane, ou de copier les visuels du studio par capture ou enregistrement d&apos;écran pour les utiliser ailleurs.</li>
            <li>Chaque téléchargement contient une marque invisible qui permet d&apos;en retrouver l&apos;origine.</li>
          </ul>
        </InfoSection>

        <InfoSection title="5. Crédits du studio">
          <p>
            Les crédits sont liés à ton compte. Leur usage, leur achat et leurs limites sont décrits dans les <Link href="/conditions-de-vente">conditions de vente</Link> (article 10).
          </p>
        </InfoSection>

        <InfoSection title="6. Données personnelles">
          <p>
            Le responsable du traitement est <Fact value={COMPANY.legalName} fallback={COMPANY.brand} />. Nous traitons tes données conformément à la loi ivoirienne n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel.
          </p>
          <ul>
            <li>
              <b>Ce que nous collectons</b> : ton nom, ton e-mail, ton téléphone, ton adresse de livraison, tes commandes et tes achats de crédits ; ton compte (et, avec Google, ton nom, ton e-mail et ta photo de profil) ; les créations envoyées avec une commande.
            </li>
            <li>
              <b>Pourquoi</b> : traiter et livrer tes commandes, te demander le paiement, gérer ton compte et tes crédits, répondre à tes messages, et respecter nos obligations légales et comptables. Nous ne vendons pas tes données et ne les utilisons pas pour de la publicité.
            </li>
            <li>
              <b>Qui y a accès</b> : notre équipe, et nos prestataires techniques pour ce qui les concerne (hébergement du site, base de données Neon, stockage Cloudflare, connexion Google si tu la choisis).
            </li>
            <li>
              <b>Combien de temps</b> : tant que ton compte est ouvert, puis le temps imposé par nos obligations légales (notamment comptables) pour les commandes.
            </li>
            <li>
              <b>Tes droits</b> : tu peux demander l&apos;accès à tes données, leur correction ou leur suppression, et t&apos;opposer à un traitement, en nous écrivant (<Fact value={COMPANY.email} fallback={<Link href="/contact">page Contact</Link>} />). Tu peux aussi saisir l&apos;ARTCI, autorité de protection des données en Côte d&apos;Ivoire.
            </li>
          </ul>
        </InfoSection>

        <InfoSection title="7. Cookies">
          <p>Le site utilise uniquement les cookies nécessaires à son fonctionnement : ta session de connexion, et ton panier gardé dans ton navigateur. Pas de cookie publicitaire ni de mesure d&apos;audience par des tiers.</p>
        </InfoSection>

        <InfoSection title="8. Responsabilité">
          <p>Nous faisons de notre mieux pour que le site soit disponible et sans erreur, mais il peut être interrompu pour maintenance ou en cas de panne. Nous ne sommes pas responsables d&apos;un usage du site contraire à ces conditions, ni du contenu des sites vers lesquels il renvoie.</p>
        </InfoSection>

        <InfoSection title="9. Modifications et droit applicable">
          <p>
            Nous pouvons modifier ces conditions ; la date de mise à jour est indiquée en bas de page, et la version en ligne au moment de ton utilisation s&apos;applique. Elles sont soumises au droit ivoirien ; en cas de litige, et à défaut d&apos;accord amiable, les tribunaux compétents d&apos;{COMPANY.city} sont saisis.
          </p>
        </InfoSection>
      </InfoPage>
    </PageShell>
  );
}
