import Link from "next/link";
import { STAGGER } from "@/lib/motion";
import { FadeUp } from "./Reveal";

const COLS = [
  { t: "Boutique", l: [["Tous les t-shirts", "/#boutique"], ["Nouveautés", "/#nouveautes"], ["Studio 3D", "/studio"], ["Panier", "/panier"]] },
  { t: "Aide", l: [["Livraison", "/#aide"], ["Guide des tailles", "/#aide"], ["Suivi de commande", "/connexion"], ["Contact", "#"]] },
  { t: "Compte", l: [["Se connecter", "/connexion"], ["Créer un compte", "/connexion"], ["Crédits studio", "/credits"]] },
  { t: "ArtSyde", l: [["L'atelier", "#"], ["Équipes et associations", "/#equipes"], ["Mentions légales", "#"], ["Conditions de vente", "#"]] },
];

export function Footer() {
  return (
    <footer className="bg-surface text-[12px] text-muted">
      <div className="mx-auto max-w-[1024px] px-5 py-10">
        <p className="border-b border-line pb-4 leading-relaxed">
          Les t-shirts sont imprimés dans notre atelier. Les couleurs à l&apos;écran peuvent légèrement différer du produit réel. Les prix sont indiqués en francs CFA.
        </p>
        <div className="grid grid-cols-2 gap-8 py-8 md:grid-cols-4">
          {COLS.map((c, i) => (
            <FadeUp key={c.t} delay={i * STAGGER.item}>
              <p className="mb-3 font-semibold text-ink">{c.t}</p>
              <ul className="space-y-2.5">
                {c.l.map(([x, href]) => (
                  <li key={x}>
                    <Link href={href} className="hover:text-ink hover:underline">
                      {x}
                    </Link>
                  </li>
                ))}
              </ul>
            </FadeUp>
          ))}
        </div>
        <div className="flex flex-col justify-between gap-2 border-t border-line pt-4 md:flex-row">
          <span>© ArtSyde. Tous droits réservés.</span>
          <span>Imprimé dans notre atelier</span>
        </div>
      </div>
    </footer>
  );
}
