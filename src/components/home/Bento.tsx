import Link from "next/link";
import { CountUp, FadeUp, RevealLines, ScrollScale } from "../Reveal";
import { DUR, STAGGER } from "@/lib/motion";

/** "Why us" bento grid of rounded tiles. */
export function Bento() {
  return (
    <section className="bg-surface py-20 md:py-28">
      <div className="mx-auto max-w-[1180px] px-5">
        <RevealLines lines={[{ text: "Pourquoi ArtSyde.", muted: "Tout est fait ici." }]} className="display max-w-3xl text-[clamp(2rem,4.5vw,3.25rem)]" />
        <div className="mt-10 grid gap-5 md:grid-cols-6">
          <ScrollScale className="relative flex flex-col justify-between gap-10 overflow-hidden rounded-[28px] bg-night p-8 text-on-night md:col-span-4 md:row-span-2 md:p-10">
            <div>
              <p className="text-[14px] font-semibold text-[#ff791b]">Studio 3D</p>
              <h3 className="display mt-2 max-w-md text-[clamp(1.8rem,3.4vw,2.6rem)]">Vois ton t-shirt avant même qu&apos;il existe.</h3>
              <p className="mt-4 max-w-md text-[17px] text-night-muted">Ton image ou ton texte sur tout le devant et tout le dos, sur le vrai t-shirt en 3D. Tu le tournes, tu choisis la couleur, puis tu le commandes.</p>
            </div>
            <Link href="/studio" className="inline-flex items-center gap-1 self-start text-[17px] text-[#2997ff] hover:underline">
              Ouvrir le studio <span>›</span>
            </Link>
          </ScrollScale>
          <FadeUp delay={STAGGER.item} className="tile bg-bg p-8 md:col-span-2">
            <p className="display text-[56px] leading-none"><CountUp to={1} duration={DUR.slow} /></p>
            <h3 className="mt-3 text-[19px] font-semibold">pièce suffit.</h3>
            <p className="mt-1 text-muted">Pas de minimum de commande en impression DTF.</p>
          </FadeUp>
          <FadeUp delay={STAGGER.item * 2} className="tile bg-bg p-8 md:col-span-2">
            <p className="display text-[44px] leading-none">Oversize</p>
            <h3 className="mt-3 text-[19px] font-semibold">coupe ample.</h3>
            <p className="mt-1 text-muted">Épaules tombantes, coton épais et souple.</p>
          </FadeUp>
          <FadeUp delay={STAGGER.item} className="tile bg-bg p-8 md:col-span-3">
            <h3 className="text-[19px] font-semibold">Imprimé à la main.</h3>
            <p className="mt-1 max-w-sm text-muted">Chaque t-shirt est imprimé, contrôlé et plié dans notre atelier.</p>
            <p className="display mt-6 text-[40px]">DTF <span className="text-muted">+</span> Sérigraphie</p>
          </FadeUp>
          <FadeUp delay={STAGGER.item * 2} className="tile bg-bg p-8 md:col-span-3">
            <h3 className="text-[19px] font-semibold">Livré chez toi.</h3>
            <p className="mt-1 max-w-sm text-muted">Livraison standard, express, ou retrait gratuit à l&apos;atelier.</p>
            <p className="display mt-6 text-[40px]">24–48 h <span className="text-[17px] font-normal text-muted">en express</span></p>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
