import type { Metadata } from "next";
import { connection } from "next/server";
import { ProductCard } from "@/components/catalog/ProductCard";
import { getProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "Catalogue",
  description: "Tous les t-shirts manga ArtSyde.",
};

export default async function CataloguePage() {
  await connection();
  const products = await getProducts();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-4xl">Catalogue</h1>
        <p className="text-ghost-white/70">
          {products.length} modèle{products.length > 1 ? "s" : ""} à porter avec fierté.
        </p>
      </header>

      {products.length === 0 ? (
        <p className="rounded-xl border border-ash-gray p-8 text-center text-ghost-white/70">
          Aucun t-shirt pour le moment. Les premiers modèles arrivent bientôt.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </main>
  );
}
