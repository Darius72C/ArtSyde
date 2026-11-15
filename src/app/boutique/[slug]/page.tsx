import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { ProductView } from "@/components/pages/ProductView";
import { getCatalog, getProduct } from "@/server/catalog";
import { formatFCFA } from "@/lib/products";
import { StockWatch } from "@/components/StockWatch";
import { AdSlot } from "@/components/AdSlot";

/** Every product is prerendered; one added later in the admin renders on its first visit. */
export async function generateStaticParams() {
  const products = await getCatalog();
  // Cache Components needs at least one param: without the database (a build with no .env), a placeholder that 404s.
  return products.length ? products.map((p) => ({ slug: p.slug })) : [{ slug: "l-essentiel" }];
}

export async function generateMetadata({ params }: PageProps<"/boutique/[slug]">): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return { title: "Produit introuvable — ArtSyde" };
  // The share card (src/app/boutique/[slug]/carte): what WhatsApp, Facebook, X… show when the link is pasted.
  const summary = `${formatFCFA(p.price)} · Tailles ${p.sizes.join(", ")} · imprimé à la commande dans notre atelier.`;
  const card = { url: `/boutique/${p.slug}/carte?format=og`, width: 1200, height: 630, alt: `${p.name}, t-shirt ArtSyde` };
  return {
    title: `${p.name} — ArtSyde`,
    description: p.description || summary,
    openGraph: { title: `${p.name} — ArtSyde`, description: summary, url: `/boutique/${p.slug}`, images: [card] },
    twitter: { card: "summary_large_image", title: `${p.name} — ArtSyde`, description: summary, images: [card.url] },
  };
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
      <StockWatch />
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
