import Link from "next/link";
import { STAGGER } from "@/lib/motion";
import { formatFCFA } from "@/lib/products";
import { plural, shortDate } from "@/lib/admin/labels";
import { getCustomers, load } from "@/lib/admin/queries";
import { Search } from "./Search";
import { DbNotice, Empty, MoreLink, Panel, Stat, TableScroll, table, td, th } from "./ui";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function CustomersView({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = one((await searchParams).q)?.trim() || undefined;
  const r = await load(() => getCustomers(q));
  if (r.problem) return <DbNotice problem={r.problem} />;
  const { customers, guestOrders } = r.data;
  const buyers = customers.filter((c) => c.orders > 0);
  const spent = customers.reduce((s, c) => s + c.spent, 0);

  return (
    <div className="space-y-5">
      {!q && (
        <div className="grid gap-5 sm:grid-cols-3">
          <Stat label="Clients inscrits" value={customers.length} unit={customers.length > 1 ? "comptes" : "compte"} note={`${plural(buyers.length, "a déjà commandé", "ont déjà commandé")}`} />
          <Stat label="Dépense moyenne par client" value={buyers.length ? Math.round(spent / buyers.length) : 0} unit="FCFA" note="Parmi ceux qui ont commandé" delay={STAGGER.item} />
          <Stat label="Commandes sans compte" value={guestOrders} unit={guestOrders > 1 ? "commandes" : "commande"} note="Passées en invité" delay={STAGGER.item * 2} />
        </div>
      )}

      <div className="flex justify-end">
        <Search action="/admin/clients" q={q} placeholder="Nom, téléphone, e-mail, ville" />
      </div>

      {customers.length ? (
        <Panel title={q ? `${plural(customers.length, "résultat")} pour « ${q} »` : "Classés par montant dépensé"} action={q && <MoreLink href="/admin/clients">Tout afficher</MoreLink>}>
          <TableScroll>
            <table className={`${table} min-w-[900px]`}>
              <thead>
                <tr>
                  <th className={th}>Client</th>
                  <th className={th}>Contact</th>
                  <th className={`${th} text-right`}>Commandes</th>
                  <th className={`${th} text-right`}>Dépensé</th>
                  <th className={`${th} text-right`}>Crédits</th>
                  <th className={`${th} text-right`}>Designs</th>
                  <th className={th}>Dernière commande</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className={td}>
                      <p className="font-semibold">{c.name}</p>
                      <p className="text-xs text-muted">
                        {c.city ?? "Ville inconnue"} · inscrit le {shortDate(c.createdAt)}
                      </p>
                    </td>
                    <td className={td}>
                      <a href={`tel:${c.phone.replace(/\s+/g, "")}`} className="whitespace-nowrap tabular-nums text-link hover:underline">
                        {c.phone}
                      </a>
                      {c.email && <p className="text-xs text-muted">{c.email}</p>}
                    </td>
                    <td className={`${td} text-right tabular-nums`}>
                      {c.orders ? (
                        <Link href={`/admin/commandes?q=${encodeURIComponent(c.phone)}`} className="text-link hover:underline">
                          {c.orders}
                        </Link>
                      ) : (
                        <span className="text-muted">0</span>
                      )}
                    </td>
                    <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{c.spent ? formatFCFA(c.spent) : <span className="text-muted">—</span>}</td>
                    <td className={`${td} text-right tabular-nums`}>{c.credits}</td>
                    <td className={`${td} text-right tabular-nums`}>{c.designs || <span className="text-muted">0</span>}</td>
                    <td className={`${td} whitespace-nowrap`}>{c.lastOrder ? shortDate(c.lastOrder) : <span className="text-muted">Jamais</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </Panel>
      ) : (
        <Empty title={q ? "Personne à ce nom." : "Pas encore de client."} actions={q ? <MoreLink href="/admin/clients">Tous les clients</MoreLink> : undefined}>
          {q ? "Essaie un numéro de téléphone ou une ville." : "Les comptes créés sur la boutique s'afficheront ici, avec leurs commandes et leurs crédits."}
        </Empty>
      )}
    </div>
  );
}
