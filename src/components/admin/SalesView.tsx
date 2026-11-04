import { ProductImage } from "../ProductImage";
import { STAGGER } from "@/lib/motion";
import { formatFCFA } from "@/lib/products";
import type { DeliveryMethod } from "@/generated/prisma/client";
import { DELIVERY_METHOD, paymentMethod, plural, shortDate } from "@/lib/admin/labels";
import { PERIODS, getSales, load, type Period } from "@/lib/admin/queries";
import { Bars } from "./Bars";
import { Segments } from "./Segments";
import { DbNotice, Delta, Panel, Share, Stat, TableScroll, table, td, th } from "./ui";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function SalesView({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const asked = Number(one((await searchParams).periode));
  const days: Period = PERIODS.find((p) => p === asked) ?? 30;
  const r = await load(() => getSales(days));
  if (r.problem) return <DbNotice problem={r.problem} />;
  const s = r.data;
  const against = `sur les ${days} jours d'avant`;
  const deliveries = s.delivery.reduce((n, d) => n + d.count, 0);

  return (
    <div className="space-y-5">
      <Segments id="sales-period" label="Période" items={PERIODS.map((p) => ({ href: p === 30 ? "/admin/ventes" : `/admin/ventes?periode=${p}`, label: `${p} jours`, active: p === days }))} />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Chiffre d'affaires" value={s.revenue} unit="FCFA, livraison comprise" note={<Delta value={s.revenueDelta} against={against} />} />
        <Stat label="Commandes payées" value={s.orders} unit={s.orders > 1 ? "commandes" : "commande"} note={<Delta value={s.ordersDelta} against={against} />} delay={STAGGER.item} />
        <Stat label="Panier moyen" value={s.average} unit="FCFA" delay={STAGGER.item * 2} />
        <Stat label="T-shirts vendus" value={s.units} unit={s.units > 1 ? "t-shirts" : "t-shirt"} delay={STAGGER.item * 3} />
      </div>

      <Panel title={s.step === 7 ? "Chiffre d'affaires par semaine" : "Chiffre d'affaires par jour"}>
        {s.orders ? (
          <Bars
            label={s.step === 7 ? "Chiffre d'affaires par semaine" : "Chiffre d'affaires par jour"}
            data={s.buckets.map((b) => ({
              label: s.step === 7 ? `sem. du ${shortDate(b.start)}` : shortDate(b.start),
              value: b.value,
              display: formatFCFA(b.value),
              note: plural(b.orders, "commande"),
            }))}
          />
        ) : (
          <p className="text-muted">Aucune commande payée sur cette période.</p>
        )}
      </Panel>

      <div className="grid items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Panel title="Meilleures ventes">
          {s.products.length ? (
            <TableScroll>
              <table className={`${table} min-w-[520px]`}>
                <thead>
                  <tr>
                    <th className={th}>Modèle</th>
                    <th className={`${th} text-right`}>Vendus</th>
                    <th className={`${th} text-right`}>Chiffre</th>
                    <th className={`${th} text-right`}>Part</th>
                  </tr>
                </thead>
                <tbody>
                  {s.products.map((p) => (
                    <tr key={p.name}>
                      <td className={td}>
                        <span className="flex items-center gap-4">
                          <ProductImage color={p.color} art={p.art ?? undefined} bg="var(--bg)" className="aspect-[4/5] w-10 shrink-0" zoom={false} />
                          <p className="font-semibold">{p.name}</p>
                        </span>
                      </td>
                      <td className={`${td} text-right tabular-nums`}>{p.units}</td>
                      <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{formatFCFA(p.revenue)}</td>
                      <td className={`${td} text-right tabular-nums text-muted`}>{Math.round((p.revenue / Math.max(s.revenue - s.deliveryFees, 1)) * 100)} %</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          ) : (
            <p className="text-muted">Rien de vendu sur cette période.</p>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel title="Moyens de paiement" delay={STAGGER.item}>
            {s.methods.length ? (
              <ul className="space-y-5">
                {s.methods.map((m) => (
                  <Share key={m.method} label={paymentMethod(m.method)} value={formatFCFA(m.value)} share={m.value / Math.max(s.revenue, 1)} />
                ))}
              </ul>
            ) : (
              <p className="text-muted">Aucun paiement sur cette période.</p>
            )}
          </Panel>

          <Panel title="Livraison" delay={STAGGER.item * 2}>
            {s.delivery.length ? (
              <ul className="space-y-5">
                {s.delivery.map((d) => (
                  <Share key={d.method} label={DELIVERY_METHOD[d.method as DeliveryMethod].label} value={plural(d.count, "commande")} share={d.count / Math.max(deliveries, 1)} />
                ))}
              </ul>
            ) : (
              <p className="text-muted">Aucune livraison sur cette période.</p>
            )}
            <dl className="mt-6 space-y-3 border-t border-line pt-6 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-muted">Frais de livraison encaissés</dt><dd className="tabular-nums">{formatFCFA(s.deliveryFees)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-muted">Crédits studio vendus ({plural(s.packsSold, "pack")})</dt><dd className="tabular-nums">{formatFCFA(s.packRevenue)}</dd></div>
            </dl>
            <p className="mt-4 text-xs text-muted">Les crédits studio ne sont pas comptés dans le chiffre d&apos;affaires des commandes.</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
