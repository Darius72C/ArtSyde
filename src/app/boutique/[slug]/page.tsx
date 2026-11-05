import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { ProductView } from "@/components/pages/ProductView";
import { getCatalog, getProduct } from "@/server/catalog";
import { LiveRefresh } from "@/components/LiveRefresh";
import { AdSlot } from "@/components/AdSlot";

/** Every product is prerendered; one added later in the admin renders on its first visit. */
export async function generateStaticParams() {
  const products = await getCatalog();
  // Cache Components needs at least one param: without the database (a build with no .env), a placeholder that 404s.
  return products.length ? products.map((p) => ({ slug: p.slug })) : [{ slug: "l-essentiel" }];
}

export async function generateMetadata({ params }: PageProps<"/boutique/[slug]">): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  return p ? { title: `${p.name} — ArtSyde`, description: p.description || undefined } : { title: "Produit introuvable — ArtSyde" };
}

async function Product({ params }: Pick<PageProps<"/boutique/[slug]">, "params">) {
  const { slug } = await params;
  const [product, all] = await Promise.all([getProduct(slug), getCatalog()]);
  if (!product) notFound();
  return (
    <>
      <ProductView product={product} others={all.filter((p) => p.id !== product.id)} />
      <AdSlot placement="product" />
      {/* Sizes sold out elsewhere go "Épuisé" here without reloading. */}
      <LiveRefresh src="/api/live/stock" events={["stock"]} />
    </>
  );
}

export default function Page(props: PageProps<"/boutique/[slug]">) {
  return (
    <PageShell>
      <Suspense fallback={<div className="mx-auto my-32 h-px w-24 animate-pulse bg-ink/40" />}>
        <Product params={props.params} />
      </Suspense>
    </PageShell>
  );
}
