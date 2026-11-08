import Link from "next/link";
import { ProductImage } from "../ProductImage";
import { FadeUp } from "../Reveal";
import { STAGGER } from "@/lib/motion";
import { formatFCFA } from "@/lib/products";
import type { CreditPack } from "@/generated/prisma/client";
import { CREDIT_PACK, CREDIT_REASON, ORDER_STATUS, dateTime, plural, shortDate } from "@/lib/admin/labels";
import { getStudio, load } from "@/server/admin/queries";
import { StudioTee3D } from "./StudioTee3D";
import { studioFiles } from "@/lib/studio-files";
import { DESIGN_SAVE_CREDITS, FREE_DESIGNS } from "@/lib/studio";
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
        <p className="text-[21px] font-semibold">Créations commandées</p>
        {s.creations.length ? (
          <ul className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
            {s.creations.map((c, i) => {
              const files = studioFiles(c.customDesigns);
              return (
                <li key={c.id} className="min-w-0">
                  <FadeUp delay={(i % 3) * STAGGER.item}>
                    {c.previewUrl ? (
                      // The studio's capture of the 3D t-shirt, taken when the customer added it to the cart.
                      // eslint-disable-next-line @next/next/no-img-element -- a stored data URL
                      <img src={c.previewUrl} alt={`Aperçu 3D de la création de ${c.order.customerName}`} width={220} height={220} className="aspect-square w-full rounded-[22px] bg-sand object-contain" />
                    ) : (
                      <ProductImage color={c.color} className="aspect-square rounded-[22px]" zoom={false} />
                    )}
                    <p className="mt-4 truncate font-semibold">
                      <Link href={`/admin/commandes/${c.order.reference}`} className="hover:underline">
                        Commande {c.order.reference}
                      </Link>
                    </p>
                    <p className="truncate text-xs text-muted">
                      {c.order.customerName} · {shortDate(c.order.createdAt)} · {ORDER_STATUS[c.order.status].label}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {c.colorName} · Taille {c.size} · × {c.quantity} · {files.length ? plural(files.length, "fichier") : <span className="text-new">pas de fichier</span>}
                    </p>
                    <StudioTee3D color={c.color} files={files} />
                  </FadeUp>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-6">
            <Empty title="Aucune création commandée.">Les t-shirts créés dans le studio 3D et commandés apparaîtront ici, avec leur vue 3D.</Empty>
          </div>
        )}
        {s.creationCount > s.creations.length && <p className="mt-8 text-sm text-muted">Les {s.creations.length} plus récentes sur {s.creationCount}.</p>}
      </div>

      <div className="pt-9">
        <p className="text-[21px] font-semibold">Designs sauvegardés</p>
        <p className="mt-1 text-sm text-muted">
          Par client. {FREE_DESIGNS} gratuites chacun, puis {DESIGN_SAVE_CREDITS} crédit{DESIGN_SAVE_CREDITS > 1 ? "s" : ""} par création en plus.
        </p>
        {s.designers.length ? (
          <ul className="mt-6 grid items-start gap-5 lg:grid-cols-2">
            {s.designers.map((c, i) => (
              <li key={c.id} className="min-w-0">
                <FadeUp delay={(i % 2) * STAGGER.item} className="tile p-6">
                  <div className="flex items-baseline justify-between gap-4">
                    <div className="min-w-0">
                      <Link href={`/admin/clients?q=${encodeURIComponent(c.phone ?? c.email ?? c.name)}`} className="block truncate text-[17px] font-semibold hover:underline">
                        {c.name}
                      </Link>
                      {(c.email || c.phone) && <p className="truncate text-xs text-muted">{c.email ?? c.phone}</p>}
                    </div>
                    <p className={`shrink-0 text-sm tabular-nums ${c.designs.length > FREE_DESIGNS ? "text-ink" : "text-muted"}`}>
                      {plural(c.designs.length, "création")}
                      {c.designs.length > FREE_DESIGNS && ` · ${c.designs.length - FREE_DESIGNS} payante${c.designs.length - FREE_DESIGNS > 1 ? "s" : ""}`}
                    </p>
                  </div>
                  <ul className="mt-5 grid grid-cols-3 gap-3">
                    {c.designs.map((g) => (
                      <li key={g.id} className="min-w-0">
                        {g.previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- a stored data URL
                          <img src={g.previewUrl} alt={`Aperçu 3D de ${g.name}`} width={220} height={220} className="aspect-square w-full rounded-2xl bg-sand object-contain" />
                        ) : (
                          <ProductImage color={g.teeColor} className="aspect-square rounded-2xl" zoom={false} />
                        )}
                        <p className="mt-2 truncate text-sm font-semibold">{g.name}</p>
                        <p className="truncate text-xs text-muted">
                          {g.colorName} · {shortDate(g.updatedAt)}
                        </p>
                        <p className="text-xs text-muted">{g.ordered ? <span className="text-ink">commandé × {g.ordered}</span> : "pas encore commandé"}</p>
                      </li>
                    ))}
                  </ul>
                </FadeUp>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6">
            <Empty title="Aucun design sauvegardé.">Les créations que les clients sauvegardent dans le studio 3D apparaîtront ici, par client.</Empty>
          </div>
        )}
        {s.designCount > 200 && <p className="mt-8 text-sm text-muted">Les 200 créations les plus récentes sur {s.designCount}.</p>}
      </div>
    </div>
  );
}
