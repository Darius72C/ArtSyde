import type { OrderStatus } from "@/generated/prisma/client";
import { ORDER_FLOW, ORDER_STATUS, plural } from "@/lib/admin/labels";
import { getOrders, load } from "@/server/admin/queries";
import { OrderTable } from "./OrderTable";
import { Search } from "./Search";
import { Segments } from "./Segments";
import { DbNotice, Empty, MoreLink, Panel } from "./ui";

const BASE = "/admin/commandes";
const href = (statut?: string, q?: string) => {
  const p = new URLSearchParams();
  if (statut) p.set("statut", statut);
  if (q) p.set("q", q);
  const s = p.toString();
  return s ? `${BASE}?${s}` : BASE;
};
const fromSlug = (slug?: string) => ORDER_FLOW.find((s) => ORDER_STATUS[s].slug === slug);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function OrdersView({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = one(sp.q)?.trim() || undefined;
  const status: OrderStatus | undefined = fromSlug(one(sp.statut));
  const r = await load(() => getOrders({ status, q }));
  if (r.problem) return <DbNotice problem={r.problem} />;
  const { orders, total, counts } = r.data;
  const all = Object.values(counts).reduce((n, c) => n + (c ?? 0), 0);

  return (
    <>
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Segments
          id="order-status"
          label="Filtrer par statut"
          items={[
            { href: href(undefined, q), label: "Toutes", count: all, active: !status },
            ...ORDER_FLOW.map((s) => ({ href: href(ORDER_STATUS[s].slug, q), label: ORDER_STATUS[s].label, count: counts[s] ?? 0, active: status === s })),
          ]}
        />
        <Search action={BASE} q={q} placeholder="Référence, client, téléphone, ville" keep={{ statut: status && ORDER_STATUS[status].slug }} />
      </div>

      {orders.length ? (
        <Panel
          title={q ? `${plural(total, "résultat")} pour « ${q} »` : status ? `${plural(total, "commande")} · ${ORDER_STATUS[status].label.toLowerCase()}` : plural(total, "commande")}
          action={(q || status) && <MoreLink href={BASE}>Tout afficher</MoreLink>}
        >
          <OrderTable orders={orders} />
          {total > orders.length && <p className="mt-4 text-sm text-muted">Les {orders.length} plus récentes sont affichées. Affine avec la recherche.</p>}
        </Panel>
      ) : (
        <Empty title={all ? "Aucune commande ici." : "Pas encore de commande."} actions={all ? <MoreLink href={BASE}>Toutes les commandes</MoreLink> : undefined}>
          {all ? "Rien ne correspond à ce filtre ou à cette recherche." : "Les commandes passées sur la boutique arriveront ici, avec leur statut et leur paiement."}
        </Empty>
      )}
    </>
  );
}
