import Link from "next/link";
import { Parallax, ScrollScale } from "../Reveal";
import { TeeIllustration } from "../ProductImage";

export function Teams() {
  return (
    <section id="equipes" className="px-5 py-10">
      <ScrollScale from={0.92} className="mx-auto grid max-w-[1180px] items-center gap-8 overflow-hidden rounded-[28px] bg-night px-8 pt-12 dark:bg-night-2 text-on-night md:grid-cols-2 md:px-14 md:py-16">
        <div>
          <p className="text-[14px] font-semibold text-[#ff791b]">Équipes, associations, événements</p>
          <h2 className="display mt-2 text-[clamp(2rem,4.5vw,3.25rem)]">Habille toute ton équipe.</h2>
          <p className="mt-4 max-w-md text-[17px] text-night-muted">Dès 20 pièces, on passe en sérigraphie : un rendu net et durable, et un meilleur prix. Envoie ton logo, on te répond avec un devis.</p>
          <div className="mt-7 flex flex-wrap items-center gap-6">
            <Link href="#" className="btn">Demander un devis</Link>
            <Link href="#" className="inline-flex items-center gap-1 text-[17px] text-[#2997ff] hover:underline">En savoir plus <span>›</span></Link>
          </div>
        </div>
        <div className="relative h-64 md:h-80">
          {[
            { c: "#C8102E", x: "4%", r: -10, z: 1, o: 70 },
            { c: "#F4F2EC", x: "28%", r: 0, z: 2, o: 30 },
            { c: "#1F2A44", x: "52%", r: 10, z: 1, o: 90 },
          ].map((t) => (
            <div key={t.c} className="absolute bottom-[-6%] w-[48%]" style={{ left: t.x, transform: `rotate(${t.r}deg)`, zIndex: t.z }}>
              <Parallax offset={t.o}>
                <TeeIllustration color={t.c} art="crest" className="w-full" />
              </Parallax>
            </div>
          ))}
        </div>
      </ScrollScale>
    </section>
  );
}
