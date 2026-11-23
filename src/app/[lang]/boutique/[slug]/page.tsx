import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { ProductView } from "@/components/pages/ProductView";
import { getCatalog, getProduct } from "@/server/catalog";
import { formatFCFA } from "@/lib/products";
import { StockWatch } from "@/components/StockWatch";
import { AdSlot } from "@/components/AdSlot";
import { languageAlternates, makeT } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n/server";
import { localized } from "@/lib/products-i18n";

/** Every product is prerendered; one added later in the admin renders on its first visit. */
export async function generateStaticParams() {
  const products = await getCatalog();
  // Cache Components needs at least one param: without the database (a build with no .env), a placeholder that 404s.
  return products.length ? products.map((p) => ({ slug: p.slug })) : [{ slug: "l-essentiel" }];
}

export async function generateMetadata({ params }: PageProps<"/[lang]/boutique/[slug]">): Promise<Metadata> {
  const locale = await getLocale();
  const t = makeT(locale);
  const found = await getProduct((await params).slug);
  if (!found) return { title: t("Produit introuvable — ArtSyde") };
  const p = localized(found, locale);
  // The share card (src/app/[lang]/boutique/[slug]/carte): what WhatsApp, Facebook, X… show when the link is pasted.
  const summary = t("{price} · Tailles {sizes} · imprimé à la commande dans notre atelier.", { price: formatFCFA(p.price), sizes: p.sizes.join(", ") });
  const card = { url: `${languageAlternates(locale, `/boutique/${p.slug}`).canonical}/carte?format=og`, width: 1200, height: 630, alt: t("{name}, t-shirt ArtSyde", { name: p.name }) };
  return {
    title: `${p.name} — ArtSyde`,
    description: p.description || summary,
    alternates: languageAlternates(locale, `/boutique/${p.slug}`),
    openGraph: { title: `${p.name} — ArtSyde`, description: summary, url: languageAlternates(locale, `/boutique/${p.slug}`).canonical, images: [card] },
    twitter: { card: "summary_large_image", title: `${p.name} — ArtSyde`, description: summary, images: [card.url] },
  };
}

async function Product({ params }: Pick<PageProps<"/[lang]/boutique/[slug]">, "params">) {
  const { slug } = await params;
  const [found, all, locale] = await Promise.all([getProduct(slug), getCatalog(), getLocale()]);
  if (!found) notFound();
  const product = localized(found, locale);
  return (
    <>
      <ProductView product={product} others={all.filter((p) => p.id !== product.id)} />
      <AdSlot placement="product" />
      {/* Sizes sold out elsewhere go "Épuisé" here without reloading. */}
      <StockWatch />
    </>
  );
}

export default function Page(props: PageProps<"/[lang]/boutique/[slug]">) {
  return (
    <PageShell>
      <Suspense fallback={<div className="mx-auto my-32 h-px w-24 animate-pulse bg-ink/40" />}>
        <Product params={props.params} />
      </Suspense>
    </PageShell>
  );
}
