"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { formatFCFA } from "@/lib/products";
import { STAGGER } from "@/lib/motion";
import { FadeUp, RevealLines } from "../Reveal";
import { DESIGN_SAVE_CREDITS, FREE_DESIGNS } from "@/lib/studio";
import { deleteMyDesign } from "@/server/my-designs";

export type AccountOrder = { reference: string; href: string; date: string; status: string; total: number; items: number };
export type AccountDesign = { id: string; name: string; color: string; preview: string | null; date: string };

const sectionTitle = "border-b border-line pb-4 text-[24px] font-semibold tracking-[-0.02em]";

/** The customer's account: orders, creations saved from the studio, credits, sign out. */
export function AccountView({ name, email, credits, orders, designs = [] }: { name: string; email: string; credits: number; orders: AccountOrder[]; designs?: AccountDesign[] }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  async function removeDesign(d: AccountDesign) {
    if (!confirm(`Supprimer « ${d.name} » ? Tes commandes ne changent pas.`)) return;
    setRemoving(d.id);
    await deleteMyDesign(d.id).catch(() => null);
    setRemoving(null);
    router.refresh();
  }

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

          <div id="creations" className="scroll-mt-24 pt-16">
            <div className="flex items-baseline justify-between gap-4 border-b border-line pb-4">
              <p className="text-[24px] font-semibold tracking-[-0.02em]">Mes créations</p>
              <p className="text-sm tabular-nums text-muted">
                {Math.min(designs.length, FREE_DESIGNS)}/{FREE_DESIGNS} gratuites{designs.length > FREE_DESIGNS ? ` · ${designs.length - FREE_DESIGNS} en plus` : ""}
              </p>
            </div>
            {designs.length ? (
              <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
                {designs.map((d) => (
                  <li key={d.id} className="min-w-0">
                    <Link href={`/studio?design=${d.id}`} className="group block">
                      {d.preview ? (
                        // eslint-disable-next-line @next/next/no-img-element -- a stored data URL
                        <img src={d.preview} alt={`Aperçu 3D de ${d.name}`} width={220} height={220} className="aspect-square w-full rounded-[22px] bg-sand object-contain transition-transform duration-500 group-hover:scale-[1.02]" />
                      ) : (
                        <span className="block aspect-square w-full rounded-[22px]" style={{ background: d.color }} aria-hidden />
                      )}
                      <span className="mt-3 block truncate font-semibold group-hover:underline">{d.name}</span>
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">{d.date}</p>
                    <p className="mt-2 flex gap-4 text-sm">
                      <Link href={`/studio?design=${d.id}`} className="text-link hover:underline">
                        Ouvrir
                      </Link>
                      <button type="button" onClick={() => removeDesign(d)} disabled={removing === d.id} className="text-danger hover:underline disabled:opacity-50">
                        {removing === d.id ? "Suppression…" : "Supprimer"}
                      </button>
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-muted">
                Aucune création sauvegardée. Dans{" "}
                <Link href="/studio" className="text-link hover:underline">
                  le studio 3D
                </Link>
                , « Sauvegarder dans mon compte » garde ton design pour plus tard.
              </p>
            )}
            <p className="mt-6 text-xs text-muted">
              {FREE_DESIGNS} créations gratuites, puis {DESIGN_SAVE_CREDITS} crédit{DESIGN_SAVE_CREDITS > 1 ? "s" : ""} par création en plus. Les commandes ne comptent pas.
            </p>
          </div>
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
