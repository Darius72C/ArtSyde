import Link from "next/link";
import type { ReactNode } from "react";
import { filled } from "@/lib/company";
import { RevealLines } from "../Reveal";

/** The information and legal pages, in the footer's order: used for the "Voir aussi" links. */
export const INFO_PAGES = [
  { href: "/livraison", label: "Livraison" },
  { href: "/guide-des-tailles", label: "Guide des tailles" },
  { href: "/suivi", label: "Suivi de commande" },
  { href: "/contact", label: "Contact" },
  { href: "/atelier", label: "L'atelier" },
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/conditions-de-vente", label: "Conditions de vente" },
  { href: "/conditions-d-utilisation", label: "Conditions d'utilisation" },
] as const;

/** A value from COMPANY, or `fallback` (nothing by default) while it hasn't been filled in. */
export function Fact({ value, fallback = null }: { value: string; fallback?: ReactNode }) {
  return filled(value) ? <>{value}</> : <>{fallback}</>;
}

/** One titled section of an information page. */
export function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="border-b border-line pb-4 text-[24px] font-semibold tracking-[-0.02em]">{title}</h2>
      <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-muted [&_b]:font-semibold [&_b]:text-ink [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_a]:text-link [&_a:hover]:underline">{children}</div>
    </section>
  );
}

/** Frame of an information page: the shop's title block, the sections, then links to the other pages. */
export function InfoPage({ eyebrow, title, muted, lead, updated, current, children }: { eyebrow: string; title: string; muted?: string; lead?: ReactNode; updated?: string; current: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[1440px] px-5 md:px-10">
      <div className="pb-10 pt-14 md:pt-20">
        <p className="eyebrow mb-5">{eyebrow}</p>
        <RevealLines as="h1" lines={[muted ? { text: title, muted } : title]} className="display text-5xl md:text-7xl" />
        {lead && <p className="lead mt-5 max-w-2xl">{lead}</p>}
      </div>
      <div className="max-w-3xl space-y-16 pb-16">{children}</div>
      {updated && <p className="max-w-3xl text-sm text-muted">Dernière mise à jour : {updated}.</p>}
      <nav aria-label="Informations" className="mt-16 border-t border-line pb-24 pt-10">
        <p className="text-[14px] font-semibold">Voir aussi</p>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
          {INFO_PAGES.filter((p) => p.href !== current).map((p) => (
            <li key={p.href}>
              <Link href={p.href} className="text-[15px] text-link hover:underline">
                {p.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
