import { ProductImage } from "../ProductImage";
import { FadeUp } from "../Reveal";
import { STAGGER } from "@/lib/motion";
import { formatFCFA } from "@/lib/products";
import type { CreditPack } from "@/generated/prisma/client";
import { CREDIT_PACK, CREDIT_REASON, dateTime, plural, shortDate } from "@/lib/admin/labels";
import { getStudio, load } from "@/server/admin/queries";
import { DbNotice, Empty, Panel, Share, Stat, TableScroll, table, td, th } from "./ui";

const PACKS = Object.keys(CREDIT_PACK) as CreditPack[];

export async function StudioAdminView() {
  const r = await load(getStudio);
  if (r.problem) return <DbNotice problem={r.problem} />;
  const s = r.data;
  const packsSold = s.packs.reduce((n, p) => n + p.sold, 0);
  const packRevenue = s.packs.reduce((n, p) => n + p.revenue, 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Crédits en circulation" value={s.inCirculation} unit="sur les comptes clients" />
        <Stat label="Crédits utilisés sur 30 jours" value={s.used30} unit="crédits" delay={STAGGER.item} />
        <Stat label="Packs vendus" value={packsSold} unit={packsSold > 1 ? "packs" : "pack"} note={`${formatFCFA(packRevenue)} au total`} delay={STAGGER.item * 2} />
        <Stat label="Designs sauvegardés" value={s.designCount} unit={s.designCount > 1 ? "designs" : "design"} delay={STAGGER.item * 3} />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Panel title="Ventes par pack">
          <ul className="border-t border-line">
            {PACKS.map((k) => {
              const p = s.packs.find((x) => x.pack === k);
              return (
                <li key={k} className="flex items-center justify-between gap-4 border-b border-line py-4">
                  <div>
                    <p className="font-semibold">{CREDIT_PACK[k].label}</p>
                    <p className="text-xs text-muted">{CREDIT_PACK[k].credits} crédits</p>
                  </div>
                  <div className="text-right">
                    <p className="tabular-nums">{plural(p?.sold ?? 0, "vente")}</p>
                    <p className="text-xs tabular-nums text-muted">{formatFCFA(p?.revenue ?? 0)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title="À quoi servent les crédits" delay={STAGGER.item}>
          {s.usage.length ? (
            <ul className="space-y-5">
              {s.usage.map((u) => (
                <Share key={u.reason} label={CREDIT_REASON[u.reason]} value={plural(u.credits, "crédit")} share={u.credits / Math.max(s.used30, 1)} />
              ))}
            </ul>
          ) : (
            <p className="text-muted">Aucun crédit utilisé ces 30 derniers jours.</p>
          )}
          <p className="mt-6 text-sm text-muted">Sur les 30 derniers jours.</p>
        </Panel>
      </div>

      <Panel title="Derniers mouvements">
        {s.ledger.length ? (
          <TableScroll>
            <table className={`${table} min-w-[680px]`}>
              <thead>
                <tr>
                  <th className={th}>Date</th>
                  <th className={th}>Client</th>
                  <th className={th}>Mouvement</th>
                  <th className={`${th} text-right`}>Crédits</th>
                  <th className={`${th} text-right`}>Payé</th>
                </tr>
              </thead>
              <tbody>
                {s.ledger.map((e) => (
                  <tr key={e.id}>
                    <td className={`${td} whitespace-nowrap text-muted`}>{dateTime(e.createdAt)}</td>
                    <td className={`${td} font-semibold`}>{e.customer.name}</td>
                    <td className={td}>
                      {CREDIT_REASON[e.reason]}
                      {e.pack && <span className="text-muted"> · {CREDIT_PACK[e.pack].label}</span>}
                      {e.design && <span className="text-muted"> · {e.design.name}</span>}
                    </td>
                    <td className={`${td} text-right font-medium tabular-nums ${e.amount > 0 ? "text-ok" : ""}`}>
                      {e.amount > 0 ? "+" : "−"}
                      {Math.abs(e.amount)}
                    </td>
                    <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{e.priceXof ? formatFCFA(e.priceXof) : <span className="text-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        ) : (
          <p className="text-muted">Aucun mouvement de crédits pour l&apos;instant.</p>
        )}
      </Panel>

      <div className="pt-9">
        <p className="text-[21px] font-semibold">Designs sauvegardés</p>
        {s.designs.length ? (
          <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 md:grid-cols-4 md:gap-x-6 xl:grid-cols-6">
            {s.designs.map((g, i) => (
              <li key={g.id} className="min-w-0">
                <FadeUp delay={(i % 6) * STAGGER.item}>
                  <ProductImage color={g.teeColor} className="aspect-[4/5] rounded-[22px]" zoom={false} />
                  <p className="mt-4 truncate font-semibold">{g.name}</p>
                  <p className="truncate text-xs text-muted">
                    {g.customer.name} · {shortDate(g.createdAt)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {g.colorName} · {g.ordered ? <span className="text-ink">commandé × {g.ordered}</span> : "pas encore commandé"}
                  </p>
                </FadeUp>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6">
            <Empty title="Aucun design sauvegardé.">Les créations que les clients sauvegardent dans le studio 3D apparaîtront ici.</Empty>
          </div>
        )}
        {s.designCount > s.designs.length && <p className="mt-8 text-sm text-muted">Les {s.designs.length} plus récents sur {s.designCount}.</p>}
      </div>
    </div>
  );
}
