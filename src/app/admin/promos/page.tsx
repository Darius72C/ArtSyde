import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { PromoForm } from "@/components/admin/PromoForm";
import { AdminPage, DbNotice, Empty, Loading, PageTitle, Panel, StatusLabel, TableScroll, table, td, th } from "@/components/admin/ui";
import { promoLabel } from "@/lib/promos";
import { formatFCFA } from "@/lib/products";
import { requireAdmin } from "@/server/admin/auth";
import { deletePromo, setPromoActive } from "@/server/admin/promos";
import { load } from "@/server/admin/queries";
import { db } from "@/server/db";

export const metadata: Metadata = { title: "Codes promo" };

const day = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

async function Promos() {
  await connection();
  await requireAdmin();
  const r = await load(() =>
    Promise.all([
      db.promoCode.findMany({ orderBy: { createdAt: "desc" } }),
      // Uses and discount given per code: the orders that used it, cancelled ones aside.
      db.order.groupBy({ by: ["promoCode"], where: { promoCode: { not: null }, status: { not: "CANCELLED" } }, _count: { _all: true }, _sum: { discountXof: true } }),
    ]),
  );
  if (r.problem) return <DbNotice problem={r.problem} />;
  const [codes, stats] = r.data;
  const now = new Date();
  const statOf = (code: string) => stats.find((s) => s.promoCode === code);

  return (
    <div className="space-y-5">
      <Panel title="Nouveau code">
        <p className="-mt-2 mb-8 max-w-2xl text-sm text-muted">Le client le tape au paiement. La remise porte sur les articles, pas sur la livraison. Mets le même code dans l&apos;e-mail Promotion (Admin &gt; E-mails).</p>
        <PromoForm />
      </Panel>
      <Panel title={`${codes.length} code${codes.length > 1 ? "s" : ""}`}>
        {codes.length ? (
          <TableScroll>
            <table className={`${table} min-w-[860px]`}>
              <thead>
                <tr>
                  <th className={th}>Code</th>
                  <th className={th}>Remise</th>
                  <th className={th}>Conditions</th>
                  <th className={th}>Utilisé</th>
                  <th className={th}>État</th>
                  <th className={th}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {codes.map((p) => {
                  const s = statOf(p.code);
                  const used = s?._count._all ?? 0;
                  const expired = p.endsAt !== null && p.endsAt < now;
                  const full = p.maxUses !== null && used >= p.maxUses;
                  const state = !p.active ? { tone: "danger" as const, label: "Désactivé" } : expired ? { tone: "danger" as const, label: "Expiré" } : full ? { tone: "new" as const, label: "Épuisé" } : { tone: "ok" as const, label: "Actif" };
                  const rules = [p.minSubtotalXof ? `Dès ${formatFCFA(p.minSubtotalXof)}` : "", p.endsAt ? `Jusqu'au ${day(p.endsAt)}` : "", p.onePerCustomer ? "Une fois par client" : ""].filter(Boolean);
                  return (
                    <tr key={p.id}>
                      <td className={`${td} align-top`}>
                        <p className="font-mono font-semibold tracking-wider">{p.code}</p>
                        {p.note && <p className="mt-1 text-sm text-muted">{p.note}</p>}
                      </td>
                      <td className={`${td} align-top tabular-nums`}>{promoLabel(p)}</td>
                      <td className={`${td} align-top text-sm text-muted`}>{rules.length ? rules.join(" · ") : "Aucune"}</td>
                      <td className={`${td} align-top text-sm tabular-nums`}>
                        {used}
                        {p.maxUses !== null && ` / ${p.maxUses}`} commande{used > 1 ? "s" : ""}
                        {s?._sum.discountXof ? <span className="block text-muted">{formatFCFA(s._sum.discountXof)} offerts</span> : null}
                      </td>
                      <td className={`${td} align-top`}>
                        <StatusLabel tone={state.tone}>{state.label}</StatusLabel>
                      </td>
                      <td className={`${td} whitespace-nowrap text-right align-top`}>
                        <form action={setPromoActive.bind(null, p.id, !p.active)} className="inline">
                          <button className="text-[15px] text-link hover:underline">{p.active ? "Désactiver" : "Réactiver"}</button>
                        </form>
                        {used === 0 && (
                          <form action={deletePromo.bind(null, p.id)} className="ml-5 inline">
                            <button className="text-[15px] text-danger hover:underline">Supprimer</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableScroll>
        ) : (
          <Empty title="Aucun code pour l'instant.">Crée ton premier code ci-dessus : il marche aussitôt au paiement.</Empty>
        )}
      </Panel>
    </div>
  );
}

export default function Page() {
  return (
    <AdminPage>
      <PageTitle eyebrow="Codes promo" lines={[{ text: "Codes promo.", muted: "Des remises au paiement." }]} />
      <Suspense fallback={<Loading />}>
        <Promos />
      </Suspense>
    </AdminPage>
  );
}
