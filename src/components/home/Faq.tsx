"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { RevealLines } from "../Reveal";

const FAQ = [
  { q: "Quelles tailles proposez-vous ?", a: "Du S au XXL pour la plupart des modèles. Un guide des tailles est disponible sur chaque fiche produit." },
  { q: "Quel est le délai de livraison ?", a: "Quelques jours ouvrés en livraison standard, 24 à 48 h en express. Tu suis chaque étape depuis ton compte." },
  { q: "Quelle qualité d'image importer dans le studio ?", a: "La plus grande possible, idéalement en PNG. Le studio t'indique si l'image risque d'être floue à l'impression." },
  { q: "À quoi servent les crédits ?", a: "Aux fonctions avancées du studio : importer une image, sauvegarder un design, générer l'aperçu HD. Tourner et colorer reste gratuit." },
  { q: "Commander pour une association ?", a: "Bien sûr. Dès 20 pièces, on passe en sérigraphie avec un devis sur mesure." },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section id="aide" className="bg-surface py-20 md:py-28">
      <div className="mx-auto max-w-[820px] px-5">
        <RevealLines lines={["Questions fréquentes."]} className="display text-center text-[clamp(2rem,4.5vw,3.25rem)]" />
        <ul className="mt-10 divide-y divide-line border-y border-line">
          {FAQ.map((f, i) => {
            const isOpen = open === i;
            return (
              <motion.li
                key={f.q}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-5%" }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: i * 0.07 }}
              >
                <button onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen} className="group flex w-full items-center justify-between gap-6 py-6 text-left">
                  <span className="text-[19px] font-semibold transition-transform duration-500 group-hover:translate-x-1.5 md:text-[21px]">{f.q}</span>
                  <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 22 }} className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xl transition-colors duration-300 ${isOpen ? "bg-accent text-white" : "bg-bg text-muted group-hover:text-ink"}`}>
                    +
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                      <motion.p initial={{ y: -12 }} animate={{ y: 0 }} exit={{ y: -12 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="max-w-2xl pb-6 text-[17px] text-muted">
                        {f.a}
                      </motion.p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
