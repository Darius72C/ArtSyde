import { db } from "@/server/db";
import { formatFCFA, parsePrint3D } from "@/lib/products";
import { r2Config } from "@/server/r2";
import { STAGGER } from "@/lib/motion";
import { load } from "@/server/admin/queries";
import { FadeUp } from "../Reveal";
import { ProductImage } from "../ProductImage";
import { MediaTabs } from "./MediaTabs";
import { PhotoManager } from "./PhotoManager";
import { Print3DEditor } from "./Print3DEditor";
import { ProductForm, type EditableProduct } from "./ProductForm";
import { DbNotice, Empty, MoreLink, PageTitle } from "./ui";

const NEW: EditableProduct = { id: "", name: "", priceXof: 0, oldPriceXof: null, tag: null, colors: [], sizes: ["S", "M", "L", "XL", "XXL"], active: true };

export async function ProductEditView({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const justCreated = (await searchParams).nouveau === "1";
  const isNew = id === "nouveau";
  const back = <MoreLink href="/admin/produits">Produits et stock</MoreLink>;

  const r = await load(() => (isNew ? Promise.resolve(null) : db.product.findUnique({ where: { id } })));
  if (r.problem)
    return (
      <>
        <PageTitle eyebrow="Produits et stock" lines={["Modèle."]} aside={back} />
        <DbNotice problem={r.problem} />
      </>
    );
  const p = r.data;
  if (!isNew && !p)
    return (
      <>
        <PageTitle eyebrow="Produits et stock" lines={["Modèle introuvable."]} aside={back} />
        <Empty title="Ce modèle n'existe plus." actions={back}>
          Il a peut-être été supprimé de la base.
        </Empty>
      </>
    );

  const configured = r2Config() !== null;
  const product: EditableProduct = p ? { id: p.id, name: p.name, priceXof: p.priceXof, oldPriceXof: p.oldPriceXof, tag: p.tag, colors: p.colors, sizes: p.sizes, active: p.active } : NEW;

  return (
    <>
      <PageTitle
        eyebrow={isNew ? "Nouveau modèle" : justCreated ? "Modèle créé : ajoute ses photos" : p!.active ? "En ligne dans la boutique" : "Masqué de la boutique"}
        lines={[isNew ? { text: "Nouveau modèle.", muted: "Les photos viennent après." } : { text: `${p!.name}.`, muted: formatFCFA(p!.priceXof) }]}
        aside={back}
      />
      <div className="grid items-start gap-5 lg:grid-cols-[1.2fr_1fr]">
        <FadeUp className="tile p-8 md:p-10">
          <p className="text-[21px] font-semibold">Fiche</p>
          <div className="mt-8">
            <ProductForm product={product} />
          </div>
        </FadeUp>
        <FadeUp delay={STAGGER.item} className="tile p-8 md:p-10">
          <p className="text-[21px] font-semibold">Images</p>
          <div className="mt-8">
            {p ? (
              <MediaTabs
                tabs={[
                  { id: "photos", label: "Photos", count: p.mockups.length, panel: <PhotoManager productId={p.id} photos={p.mockups} configured={configured} name={p.name} /> },
                  { id: "mockup", label: "Mockup", count: p.flatMockups.length, panel: <PhotoManager kind="flats" productId={p.id} photos={p.flatMockups} configured={configured} name={p.name} /> },
                  { id: "3d", label: "3D", panel: <Print3DEditor productId={p.id} initial={parsePrint3D(p.print3d)} colors={p.colors} configured={configured} /> },
                ]}
              />
            ) : (
              <div className="flex items-center gap-5">
                <ProductImage color="#F4F2EC" bg="var(--bg)" className="aspect-[4/5] w-20 shrink-0" zoom={false} />
                <p className="text-muted">Crée le modèle d&apos;abord, puis ajoute ses photos ici.</p>
              </div>
            )}
          </div>
        </FadeUp>
      </div>
    </>
  );
}
