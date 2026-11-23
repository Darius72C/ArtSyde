import Link from "@/components/LocaleLink";
import { CountUp, FadeUp, RevealLines, ScrollScale } from "../Reveal";
import { DUR, STAGGER } from "@/lib/motion";
import { getT } from "@/lib/i18n/server";

/** "Why us" bento grid of rounded tiles. */
export async function Bento() {
  const t = await getT();
  return (
    <section className="bg-surface py-20 md:py-28">
      <div className="mx-auto max-w-[1180px] px-5">
        <RevealLines lines={[{ text: t("Pourquoi ArtSyde."), muted: t("Tout est fait ici.") }]} className="display max-w-3xl text-[clamp(2rem,4.5vw,3.25rem)]" />
        <div className="mt-10 grid gap-5 md:grid-cols-6">
          <ScrollScale className="relative flex flex-col justify-between gap-10 overflow-hidden rounded-[28px] bg-night p-8 text-on-night md:col-span-4 md:row-span-2 md:p-10">
            <div>
              <p className="text-[14px] font-semibold text-[#ff791b]">{t("Studio 3D")}</p>
              <h3 className="display mt-2 max-w-md text-[clamp(1.8rem,3.4vw,2.6rem)]">{t("Vois ton t-shirt avant même qu'il existe.")}</h3>
              <p className="mt-4 max-w-md text-[17px] text-night-muted">{t("Ton image ou ton texte sur tout le devant et tout le dos, sur le vrai t-shirt en 3D. Tu le tournes, tu choisis la couleur, puis tu le commandes.")}</p>
            </div>
            <Link href="/studio" className="inline-flex items-center gap-1 self-start text-[17px] text-[#2997ff] hover:underline">
              {t("Ouvrir le studio")} <span>›</span>
            </Link>
          </ScrollScale>
          <FadeUp delay={STAGGER.item} className="tile bg-bg p-8 md:col-span-2">
            <p className="display text-[56px] leading-none"><CountUp to={1} duration={DUR.slow} /></p>
            <h3 className="mt-3 text-[19px] font-semibold">{t("pièce suffit.")}</h3>
            <p className="mt-1 text-muted">{t("Pas de minimum de commande en impression DTF.")}</p>
          </FadeUp>
          <FadeUp delay={STAGGER.item * 2} className="tile bg-bg p-8 md:col-span-2">
            <p className="display text-[44px] leading-none">Oversize</p>
            <h3 className="mt-3 text-[19px] font-semibold">{t("coupe ample.")}</h3>
            <p className="mt-1 text-muted">{t("Épaules tombantes, coton épais et souple.")}</p>
          </FadeUp>
          <FadeUp delay={STAGGER.item} className="tile bg-bg p-8 md:col-span-3">
            <h3 className="text-[19px] font-semibold">{t("Imprimé à la main.")}</h3>
            <p className="mt-1 max-w-sm text-muted">{t("Chaque t-shirt est imprimé, contrôlé et plié dans notre atelier.")}</p>
            <p className="display mt-6 text-[40px]">DTF <span className="text-muted">+</span> {t("Sérigraphie")}</p>
          </FadeUp>
          <FadeUp delay={STAGGER.item * 2} className="tile bg-bg p-8 md:col-span-3">
            <h3 className="text-[19px] font-semibold">{t("Livré chez toi.")}</h3>
            <p className="mt-1 max-w-sm text-muted">{t("Livraison standard, express, ou retrait gratuit à l'atelier.")}</p>
            <p className="display mt-6 text-[40px]">24–48 h <span className="text-[17px] font-normal text-muted">{t("en express")}</span></p>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
