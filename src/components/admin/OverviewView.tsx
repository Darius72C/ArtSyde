import Link from "next/link";
import { ProductImage } from "../ProductImage";
import { STAGGER } from "@/lib/motion";
import { ORDER_FLOW, ORDER_STATUS, plural, shortDate } from "@/lib/admin/labels";
import { getOverview, load } from "@/server/admin/queries";
import { OrderTable } from "./OrderTable";
import { DbNotice, Delta, MoreLink, Panel, Stat, StatusLabel, Swatch } from "./ui";

export async function OverviewView() {
  const r = await load(getOverview);
  if (r.problem) return <DbNotice problem={r.problem} />;
  const d = r.data;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Chiffre d'affaires sur 30 jours" value={d.revenue} unit="FCFA" note={<Delta value={d.revenueDelta} against="sur les 30 jours d'avant" />} />
        <Stat
          label="En cours à l'atelier"
          value={d.toHandle}
          unit={d.toHandle > 1 ? "commandes" : "commande"}
          note={d.toPay ? `${plural(d.toPay, "autre")} en attente de paiement` : "Aucune en attente de paiement"}
          delay={STAGGER.item}
        />
        <Stat label="Clients inscrits" value={d.customers} unit={d.customers > 1 ? "clients" : "client"} note={`${d.newCustomers ? `+${d.newCustomers}` : "Aucun nouveau"} sur 30 jours`} delay={STAGGER.item * 2} />
        <Stat label="Crédits vendus sur 30 jours" value={d.packRevenue} unit="FCFA" note={plural(d.packsSold, "pack vendu", "packs vendus")} delay={STAGGER.item * 3} />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1.7fr_1fr]">
        <Panel title="Dernières commandes" action={<MoreLink href="/admin/commandes">Toutes</MoreLink>}>
          {d.recent.length ? <OrderTable orders={d.recent} compact /> : <p className="text-muted">Pas encore de commande. Elles arriveront ici dès que le paiement sera branché.</p>}
        </Panel>

        <Panel title="Où en sont les commandes" delay={STAGGER.item}>
          <ul className="border-t border-line">
            {ORDER_FLOW.map((s) => (
              <li key={s}>
                <Link href={`/admin/commandes?statut=${ORDER_STATUS[s].slug}`} className="group flex items-center justify-between gap-4 border-b border-line py-3 text-[15px]">
                  <StatusLabel tone={ORDER_STATUS[s].tone}>
                    <span className="group-hover:underline">{ORDER_STATUS[s].label}</span>
                  </StatusLabel>
                  <span className={`tabular-nums ${d.counts[s] ? "font-semibold" : "text-muted"}`}>{d.counts[s] ?? 0}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Panel title="Stock bas" action={<MoreLink href="/admin/produits">Produits et stock</MoreLink>}>
          {d.lowStock.length ? (
            <ul className="border-t border-line">
              {d.lowStock.slice(0, 8).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-4 border-b border-line py-3 text-[15px]">
                  <span className="flex items-center gap-3">
                    <Swatch hex={s.colorHex} />
                    <span>
                      <span className="font-semibold">{s.colorName}</span> <span className="text-muted">· {s.size}</span>
                    </span>
                  </span>
                  <span className={`tabular-nums ${s.quantity === 0 ? "font-medium text-danger" : "text-new"}`}>{s.quantity === 0 ? "Épuisé" : plural(s.quantity, "restant")}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">Toutes les couleurs sont au-dessus de leur seuil.</p>
          )}
          {d.lowStock.length > 8 && <p className="mt-4 text-sm text-muted">Et {plural(d.lowStock.length - 8, "autre ligne", "autres lignes")} sous le seuil.</p>}
        </Panel>

        <Panel title="Derniers designs du studio" action={<MoreLink href="/admin/studio">Studio</MoreLink>} delay={STAGGER.item}>
          {d.designs.length ? (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {d.designs.map((g) => (
                <li key={g.id} className="min-w-0">
                  <ProductImage color={g.teeColor} bg="var(--bg)" className="aspect-[4/5] rounded-[22px]" zoom={false} />
                  <p className="mt-3 truncate text-[15px] font-semibold">{g.name}</p>
                  <p className="truncate text-xs text-muted">
                    {g.customer.name} · {shortDate(g.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">Aucun design sauvegardé pour l&apos;instant.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
