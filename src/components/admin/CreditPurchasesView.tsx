import { STAGGER } from "@/lib/motion";
import { formatFCFA } from "@/lib/products";
import { CREDIT_PACKS } from "@/lib/credits";
import { dateTime, paymentMethod, plural } from "@/lib/admin/labels";
import { getCreditPurchases, load } from "@/lib/admin/queries";
import { MarkPaid } from "./MarkPaid";
import { Search } from "./Search";
import { Segments } from "./Segments";
import { DbNotice, Empty, MoreLink, Panel, Stat, StatusLabel, TableScroll, table, td, th } from "./ui";

const BASE = "/admin/credits";
const FILTERS = [
  { slug: undefined, label: "Tous", paid: undefined },
  { slug: "a-encaisser", label: "À encaisser", paid: false },
  { slug: "payes", label: "Payés", paid: true },
] as const;
const href = (etat?: string, q?: string) => {
  const p = new URLSearchParams();
  if (etat) p.set("etat", etat);
  if (q) p.set("q", q);
  const s = p.toString();
  return s ? `${BASE}?${s}` : BASE;
};
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function CreditPurchasesView({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = one(sp.q)?.trim() || undefined;
  const filter = FILTERS.find((f) => f.slug === one(sp.etat)) ?? FILTERS[0];
  const r = await load(() => getCreditPurchases({ paid: filter.paid, q }));
  if (r.problem) return <DbNotice problem={r.problem} />;
  const { purchases, unpaid, paid } = r.data;
  const count = (f: (typeof FILTERS)[number]) => (f.paid === undefined ? unpaid.count + paid.count : f.paid ? paid.count : unpaid.count);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Stat label="À encaisser" value={unpaid.value} unit="FCFA" note={`${plural(unpaid.count, "achat")} en attente de paiement`} />
        <Stat label="Encaissé" value={paid.value} unit="FCFA" note={plural(paid.count, "achat payé", "achats payés")} delay={STAGGER.item} />
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Segments id="credit-purchases" label="Filtrer par paiement" items={FILTERS.map((f) => ({ href: href(f.slug, q), label: f.label, count: count(f), active: f === filter }))} />
        <Search action={BASE} q={q} placeholder="Référence, client, téléphone" keep={{ etat: filter.slug }} />
      </div>

      {purchases.length ? (
        <Panel title={q ? `${plural(purchases.length, "résultat")} pour « ${q} »` : "Les achats à encaisser d'abord"} action={(q || filter.slug) && <MoreLink href={BASE}>Tout afficher</MoreLink>}>
          <TableScroll>
            <table className={`${table} min-w-[860px]`}>
              <thead>
                <tr>
                  <th className={th}>Achat</th>
                  <th className={th}>Client</th>
                  <th className={th}>Pack</th>
                  <th className={`${th} text-right`}>Montant</th>
                  <th className={th}>Paiement</th>
                  <th className={`${th} text-right`}>
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id}>
                    <td className={td}>
                      <p className="whitespace-nowrap font-semibold">{p.reference}</p>
                      <p className="text-xs text-muted">{dateTime(p.createdAt)}</p>
                    </td>
                    <td className={td}>
                      <p className="whitespace-nowrap font-semibold">{p.customerName}</p>
                      <a href={`tel:${p.customerPhone.replace(/\s+/g, "")}`} className="text-xs tabular-nums text-link hover:underline">
                        {p.customerPhone}
                      </a>
                      {p.customerEmail && <p className="text-xs text-muted">{p.customerEmail}</p>}
                    </td>
                    <td className={td}>
                      <p className="font-semibold">{CREDIT_PACKS[p.pack].name}</p>
                      <p className="text-xs text-muted">{plural(p.credits, "crédit")}</p>
                    </td>
                    <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{formatFCFA(p.priceXof)}</td>
                    <td className={td}>
                      {p.paymentStatus === "PAID" ? <StatusLabel tone="ok">Payé</StatusLabel> : <StatusLabel tone="new">En attente</StatusLabel>}
                      <p className="text-xs text-muted">
                        {paymentMethod(p.paymentMethod)}
                        {p.paidAt && ` · le ${dateTime(p.paidAt)}`}
                      </p>
                    </td>
                    <td className={`${td} text-right`}>
                      {p.paymentStatus === "UNPAID" ? <MarkPaid id={p.id} label={`${p.reference}, ${p.customerName}`} /> : <span className="text-xs text-muted">Crédits ajoutés</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          <p className="mt-4 text-sm text-muted">« Marquer payé » ajoute les crédits au compte du client (créé à partir du téléphone s&apos;il n&apos;existe pas). Un second clic ne crédite rien.</p>
        </Panel>
      ) : (
        <Empty title={q || filter.slug ? "Aucun achat ici." : "Pas encore d'achat de crédits."} actions={q || filter.slug ? <MoreLink href={BASE}>Tous les achats</MoreLink> : undefined}>
          {q || filter.slug ? "Rien ne correspond à ce filtre ou à cette recherche." : "Les packs achetés sur la page Crédits arriveront ici, en attente de paiement."}
        </Empty>
      )}
    </div>
  );
}
