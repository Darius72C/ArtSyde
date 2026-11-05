import Link from "next/link";
import { ProductImage } from "../ProductImage";
import { STAGGER } from "@/lib/motion";
import { formatFCFA } from "@/lib/products";
import { PRODUCT_TAG, SIZE_ORDER, colorName, plural } from "@/lib/admin/labels";
import { getCatalogue, load } from "@/server/admin/queries";
import { DbNotice, MoreLink, Panel, Stat, StatusLabel, Swatch, TableScroll, table, td, th } from "./ui";
import { StockEditor } from "./StockEditor";

export async function ProductsView() {
  const r = await load(getCatalogue);
  if (r.problem) return <DbNotice problem={r.problem} />;
  const { products, studio, colours, lowHex, lowCount, units } = r.data;
  const active = products.filter((p) => p.active).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Modèles en ligne" value={active} unit={`sur ${plural(products.length, "modèle")}`} />
        <Stat label="T-shirts vierges en stock" value={units} unit={`en ${plural(colours.length, "couleur")}`} delay={STAGGER.item} />
        <Stat label="Lignes en stock bas" value={lowCount} unit="à recommander" note="Seuil réglé par ligne, 5 par défaut" delay={STAGGER.item * 2} />
        <Stat label="Créations studio vendues" value={studio.units} unit="t-shirts" note={formatFCFA(studio.revenue)} delay={STAGGER.item * 3} />
      </div>

      <Panel title="Catalogue" action={<MoreLink href="/admin/produits/nouveau">Nouveau modèle</MoreLink>}>
        {products.length ? (
          <TableScroll>
            <table className={`${table} min-w-[860px]`}>
              <thead>
                <tr>
                  <th className={th}>Modèle</th>
                  <th className={`${th} text-right`}>Prix</th>
                  <th className={th}>Couleurs</th>
                  <th className={th}>Tailles</th>
                  <th className={`${th} text-right`}>Vendus</th>
                  <th className={`${th} text-right`}>Chiffre</th>
                  <th className={th}>État</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className={td}>
                      <div className="flex items-center gap-4">
                        <ProductImage color={p.colors[0] ?? "#F4F2EC"} art={p.art ?? undefined} photo={p.mockups[0]} bg="var(--bg)" className="aspect-[4/5] w-14 shrink-0" zoom={false} />
                        <div>
                          <Link href={`/admin/produits/${p.id}`} className="font-semibold text-link hover:underline">
                            {p.name}
                          </Link>
                          {p.tag && <p className="text-xs text-new">{PRODUCT_TAG[p.tag]}</p>}
                        </div>
                      </div>
                    </td>
                    <td className={`${td} whitespace-nowrap text-right tabular-nums`}>
                      {formatFCFA(p.priceXof)}
                      {p.oldPriceXof && <p className="text-xs text-muted line-through">{formatFCFA(p.oldPriceXof)}</p>}
                    </td>
                    <td className={td}>
                      <div className="flex flex-wrap items-center gap-2">
                        {p.colors.map((hex) => (
                          <Swatch key={hex} hex={hex} name={`${colorName(hex)}${lowHex.has(hex.toLowerCase()) ? ", stock bas" : ""}`} className={lowHex.has(hex.toLowerCase()) ? "!ring-2 !ring-new" : ""} />
                        ))}
                      </div>
                    </td>
                    <td className={`${td} text-muted`}>{SIZE_ORDER.filter((s) => p.sizes.includes(s)).join(" · ")}</td>
                    <td className={`${td} text-right tabular-nums`}>{p.sales.units}</td>
                    <td className={`${td} whitespace-nowrap text-right tabular-nums`}>{formatFCFA(p.sales.revenue)}</td>
                    <td className={td}>{p.active ? <StatusLabel tone="ok">En ligne</StatusLabel> : <StatusLabel tone="muted">Masqué</StatusLabel>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        ) : (
          <p className="text-muted">Aucun modèle pour l&apos;instant. Crée le premier avec « Nouveau modèle ».</p>
        )}
        {products.length > 0 && lowHex.size > 0 && <p className="mt-4 text-sm text-muted">Une couleur cerclée d&apos;orange a au moins une taille en stock bas.</p>}
      </Panel>

      <Panel title="Stock des t-shirts vierges" delay={STAGGER.item}>
        <StockEditor colours={colours.map((c) => ({ hex: c.hex, name: c.name, sizes: c.sizes.map((x) => ({ id: x.id, size: x.size, quantity: x.quantity, lowAt: x.lowAt })) }))} />
      </Panel>
    </div>
  );
}
