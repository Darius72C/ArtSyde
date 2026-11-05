"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { formatFCFA } from "@/lib/products";
import { STAGGER } from "@/lib/motion";
import { FadeUp, RevealLines } from "../Reveal";

export type AccountOrder = { reference: string; href: string; date: string; status: string; total: number; items: number };

const sectionTitle = "border-b border-line pb-4 text-[24px] font-semibold tracking-[-0.02em]";

/** The customer's account: credits, orders, sign out. */
export function AccountView({ name, email, credits, orders }: { name: string; email: string; credits: number; orders: AccountOrder[] }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function signOut() {
    setLeaving(true);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-[1440px] px-5 md:px-10">
      <div className="pb-10 pt-14 md:pt-20">
        <p className="eyebrow mb-5">{email}</p>
        <RevealLines as="h1" lines={[{ text: `Bonjour ${name.split(" ")[0]}.`, muted: "Ton compte." }]} className="display text-5xl md:text-7xl" />
      </div>

      <div className="grid items-start gap-14 pb-24 lg:grid-cols-[1fr_400px] lg:gap-20">
        <FadeUp>
          <p className={sectionTitle}>Mes commandes</p>
          {orders.length ? (
            <ul>
              {orders.map((o) => (
                <li key={o.reference} className="border-b border-line">
                  <Link href={o.href} className="group flex flex-wrap items-center justify-between gap-4 py-5">
                    <span>
                      <span className="block font-semibold group-hover:underline">{o.reference}</span>
                      <span className="block text-sm text-muted">
                        {o.date} · {o.items} article{o.items > 1 ? "s" : ""}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm">{o.status}</span>
                      <span className="block text-sm tabular-nums text-muted">{formatFCFA(o.total)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-muted">
              Pas encore de commande.{" "}
              <Link href="/#boutique" className="text-link hover:underline">
                La boutique
              </Link>{" "}
              ou{" "}
              <Link href="/studio" className="text-link hover:underline">
                le studio 3D
              </Link>{" "}
              t&apos;attendent.
            </p>
          )}
        </FadeUp>

        <FadeUp delay={STAGGER.item} className="tile p-8 lg:sticky lg:top-20">
          <p className="text-[21px] font-semibold">Crédits studio</p>
          <p className="display mt-4 text-6xl tabular-nums">{credits}</p>
          <p className="mt-2 text-sm text-muted">Pour importer des images et télécharger en HD dans le studio.</p>
          <Link href="/credits" className="btn mt-8 w-full">
            Recharger
          </Link>
          <Link href="/studio" className="mt-5 block text-center text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
            Ouvrir le studio
          </Link>
          <Link href="/compte/parametres" className="mt-8 block border-t border-line pt-6 text-center text-[15px] text-link hover:underline">
            Paramètres du compte
          </Link>
          <button type="button" onClick={signOut} disabled={leaving} className="mt-4 w-full text-[15px] text-danger hover:underline disabled:opacity-50">
            {leaving ? "Déconnexion…" : "Se déconnecter"}
          </button>
        </FadeUp>
      </div>
    </div>
  );
}
