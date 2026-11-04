import Link from "next/link";
import { CREDIT_PACKS, CREDIT_PACK_IDS } from "@/lib/credits";
import { formatFCFA } from "@/lib/products";
import { CountUp, FadeUp, RevealLines, Tilt } from "../Reveal";
import { STAGGER } from "@/lib/motion";

export function Credits() {
  return (
    <section id="credits" className="mx-auto max-w-[1180px] px-5 py-20 md:py-28">
      <div className="text-center">
        <RevealLines lines={["Crédits studio."]} className="display text-[clamp(2rem,4.5vw,3.25rem)]" />
        <FadeUp>
          <p className="lead mx-auto mt-3 max-w-xl">Tourner et colorer ton t-shirt est gratuit. Les crédits servent à importer une image, sauvegarder un design et générer l&apos;aperçu HD.</p>
        </FadeUp>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {CREDIT_PACK_IDS.map((id) => [id, CREDIT_PACKS[id]] as const).map(([id, p], i) => (
          <FadeUp key={p.name} delay={i * STAGGER.item} className="group">
            <Tilt max={5} className={`tile relative flex h-full flex-col items-center p-8 text-center ${p.best ? "ring-2 ring-accent" : ""}`}>
            {p.best && <span className="absolute -top-px left-1/2 -translate-x-1/2 rounded-b-xl bg-accent px-3 py-1 text-[12px] font-medium text-white">Le plus choisi</span>}
            <p className="mt-3 text-[19px] font-semibold">{p.name}</p>
            <p className="display mt-4 text-[64px] leading-none"><CountUp to={p.credits} /></p>
            <p className="text-muted">crédits</p>
            <p className="mt-4 text-[15px] text-muted">{p.note}</p>
            <p className="mt-6 text-[21px] font-semibold">{formatFCFA(p.priceXof)}</p>
            <Link href={`/credits?pack=${id.toLowerCase()}`} className={`${p.best ? "btn" : "btn-outline"} mt-6`}>Recharger</Link>
            </Tilt>
          </FadeUp>
        ))}
      </div>
      <p className="mt-8 text-center text-[14px] text-muted">5 crédits offerts à l&apos;inscription. Tarifs indicatifs.</p>
    </section>
  );
}
