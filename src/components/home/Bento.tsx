import Link from "next/link";
import { CountUp, FadeUp, Parallax, RevealLines, ScrollScale } from "../Reveal";
import { TeeIllustration } from "../ProductImage";

/** "Why us" bento grid of rounded tiles. */
export function Bento() {
  return (
    <section className="bg-surface py-20 md:py-28">
      <div className="mx-auto max-w-[1180px] px-5">
        <RevealLines lines={[{ text: "Pourquoi ArtSyde.", muted: "Tout est fait ici." }]} className="display max-w-3xl text-[clamp(2rem,4.5vw,3.25rem)]" />
        <div className="mt-10 grid gap-5 md:grid-cols-6">
          <ScrollScale className="group relative overflow-hidden rounded-[28px] bg-night p-8 text-on-night md:col-span-4 md:row-span-2 md:p-10">
            <p className="text-[14px] font-semibold text-[#ff791b]">Studio 3D</p>
            <h3 className="display mt-2 max-w-sm text-[clamp(1.8rem,3.4vw,2.6rem)]">Vois ton t-shirt avant même qu&apos;il existe.</h3>
            <Link href="/studio" className="mt-4 inline-flex items-center gap-1 text-[17px] text-[#2997ff] hover:underline">
              Ouvrir le studio <span>›</span>
            </Link>
            <div className="pointer-events-none mt-6 flex justify-end md:absolute md:bottom-0 md:right-6 md:mt-0 md:w-[52%]">
              <Parallax offset={50} className="w-[70%] md:w-full">
                <TeeIllustration color="#C8102E" art="script" className="w-full transition-transform duration-700 group-hover:rotate-[-4deg] group-hover:scale-105" />
              </Parallax>
            </div>
          </ScrollScale>
          <FadeUp delay={0.08} className="tile bg-bg p-8 md:col-span-2">
            <p className="display text-[56px] leading-none"><CountUp to={1} duration={0.8} /></p>
            <h3 className="mt-3 text-[19px] font-semibold">pièce suffit.</h3>
            <p className="mt-1 text-muted">Pas de minimum de commande en impression DTF.</p>
          </FadeUp>
          <FadeUp delay={0.16} className="tile bg-bg p-8 md:col-span-2">
            <p className="display text-[56px] leading-none"><CountUp to={8} duration={1.4} /></p>
            <h3 className="mt-3 text-[19px] font-semibold">coloris en stock.</h3>
            <div className="mt-4 flex gap-1.5">
              {["#1C1C1E", "#F4F2EC", "#9EA0A3", "#1F2A44", "#C8102E", "#6B6B47", "#D8C7A5", "#E9A7B8"].map((c) => (
                <span key={c} className="h-5 w-5 rounded-full ring-1 ring-ink/25 transition-transform duration-300 hover:-translate-y-1 hover:scale-125" style={{ background: c }} />
              ))}
            </div>
          </FadeUp>
          <FadeUp delay={0.08} className="tile bg-bg p-8 md:col-span-3">
            <h3 className="text-[19px] font-semibold">Imprimé à la main.</h3>
            <p className="mt-1 max-w-sm text-muted">Chaque t-shirt est imprimé, contrôlé et plié dans notre atelier.</p>
            <p className="display mt-6 text-[40px]">DTF <span className="text-muted">+</span> Sérigraphie</p>
          </FadeUp>
          <FadeUp delay={0.16} className="tile bg-bg p-8 md:col-span-3">
            <h3 className="text-[19px] font-semibold">Livré chez toi.</h3>
            <p className="mt-1 max-w-sm text-muted">Livraison standard, express, ou retrait gratuit à l&apos;atelier.</p>
            <p className="display mt-6 text-[40px]">24–48 h <span className="text-[17px] font-normal text-muted">en express</span></p>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
