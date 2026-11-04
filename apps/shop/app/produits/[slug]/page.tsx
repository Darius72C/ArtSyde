import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ProductConfigurator } from "@/components/product/ProductConfigurator";
import { getProductBySlug } from "@/lib/products";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Produit introuvable" };
  return { title: product.name, description: product.description };
}

export default async function ProductPage({ params }: Props) {
  // Les produits changent depuis le monitoring : la page est générée à chaque visite.
  await connection();
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <Link href="/catalogue" className="text-sm text-ghost-white/60 hover:text-curse-violet">
        ← Retour au catalogue
      </Link>
      <ProductConfigurator
        product={{
          id: product.id,
          name: product.name,
          description: product.description,
          priceXof: product.priceXof,
          designUrl: product.designUrl,
          colors: product.colors,
          sizes: product.sizes,
        }}
      />
    </main>
  );
}
