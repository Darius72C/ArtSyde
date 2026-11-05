import Link from "next/link";
import { ScrollScale } from "../Reveal";

export function Teams() {
  return (
    <section id="equipes" className="px-5 py-10">
      <ScrollScale from={0.92} className="mx-auto flex max-w-[1180px] flex-col gap-8 overflow-hidden rounded-[28px] bg-night px-8 py-12 dark:bg-night-2 text-on-night md:flex-row md:items-end md:justify-between md:px-14 md:py-16">
        <div>
          <p className="text-[14px] font-semibold text-[#ff791b]">Équipes, associations, événements</p>
          <h2 className="display mt-2 text-[clamp(2rem,4.5vw,3.25rem)]">Habille toute ton équipe.</h2>
          <p className="mt-4 max-w-md text-[17px] text-night-muted">Dès 20 pièces, on passe en sérigraphie : un rendu net et durable, et un meilleur prix. Envoie ton logo, on te répond avec un devis.</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-6">
          <Link href="#" className="btn">Demander un devis</Link>
          <Link href="#" className="inline-flex items-center gap-1 text-[17px] text-[#2997ff] hover:underline">En savoir plus <span>›</span></Link>
        </div>
      </ScrollScale>
    </section>
  );
}
