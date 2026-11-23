"use client";

import Link from "@/components/LocaleLink";
import { COMPANY } from "@/lib/company";
import { STAGGER } from "@/lib/motion";
import { FadeUp } from "./Reveal";
import { useT } from "./I18nProvider";

const COLS = [
  { t: "Boutique", l: [["Tous les t-shirts", "/#boutique"], ["Nouveautés", "/#nouveautes"], ["Studio 3D", "/studio"], ["Panier", "/panier"]] },
  { t: "Aide", l: [["Livraison", "/livraison"], ["Guide des tailles", "/guide-des-tailles"], ["Suivi de commande", "/suivi"], ["Questions fréquentes", "/#aide"], ["Contact", "/contact"], ...(COMPANY.whatsapp ? [["WhatsApp", COMPANY.whatsapp]] : [])] },
  { t: "Compte", l: [["Se connecter", "/connexion"], ["Mon compte", "/compte"], ["Crédits studio", "/credits"]] },
  { t: "ArtSyde", l: [["L'atelier", "/atelier"], ["Équipes et associations", "/#equipes"], ["Mentions légales", "/mentions-legales"], ["Conditions de vente", "/conditions-de-vente"], ["Conditions d'utilisation", "/conditions-d-utilisation"]] },
];

export function Footer() {
  const t = useT();
  return (
    <footer className="bg-surface text-[12px] text-muted">
      <div className="mx-auto max-w-[1024px] px-5 py-10">
        <p className="border-b border-line pb-4 leading-relaxed">
          {t("Les t-shirts sont imprimés dans notre atelier. Les couleurs à l'écran peuvent légèrement différer du produit réel. Les prix sont indiqués en francs CFA.")}
        </p>
        <div className="grid grid-cols-2 gap-8 py-8 md:grid-cols-4">
          {COLS.map((c, i) => (
            <FadeUp key={c.t} delay={i * STAGGER.item}>
              <p className="mb-3 font-semibold text-ink">{t(c.t)}</p>
              <ul className="space-y-2.5">
                {c.l.map(([x, href]) => (
                  <li key={x}>
                    <Link href={href} className="hover:text-ink hover:underline">
                      {t(x)}
                    </Link>
                  </li>
                ))}
              </ul>
            </FadeUp>
          ))}
        </div>
        <div className="flex flex-col justify-between gap-2 border-t border-line pt-4 md:flex-row">
          <span>{t("© ArtSyde. Tous droits réservés.")}</span>
          <span>{t("Imprimé dans notre atelier")}</span>
        </div>
        {/* Required by the 3D model's licence (CC BY 4.0). */}
        <p className="mt-3">
          {t("Modèle 3D du t-shirt :")} «{" "}
          <a href="https://sketchfab.com/3d-models/oversized-t-shirt-3b6e78d6a1a74370a6e5af6f312d38f7" className="hover:text-ink hover:underline" target="_blank" rel="noopener noreferrer">
            Oversized t-shirt
          </a>{" "}
          » {t("par")}{" "}
          <a href="https://sketchfab.com/kylelhb" className="hover:text-ink hover:underline" target="_blank" rel="noopener noreferrer">
            kylelhb
          </a>
          , {t("licence")}{" "}
          <a href="http://creativecommons.org/licenses/by/4.0/" className="hover:text-ink hover:underline" target="_blank" rel="noopener noreferrer">
            CC BY 4.0
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
