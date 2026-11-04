import Link from "next/link";
import { connection } from "next/server";
import { brand, BrandSymbol } from "@artsyde/ui";
import { ProductCard } from "@/components/catalog/ProductCard";
import { getLatestProducts } from "@/lib/products";

export default async function HomePage() {
  await connection();
  const latest = await getLatestProducts(4);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-12">
      <section className="flex flex-col items-center gap-6 py-10 text-center">
        <BrandSymbol size={96} />
        <h1 className="font-display text-5xl sm:text-7xl">
          ART<span className="text-curse-violet">SYDE</span>
        </h1>
        <p className="font-display text-2xl text-curse-violet">{brand.slogan}</p>
        <p className="max-w-md text-ghost-white/70">
          T-shirts de style manga, ou créés avec tes propres images. Imprimés et livrés en Côte
          d&apos;Ivoire.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/catalogue"
            className="rounded-md bg-curse-violet px-5 py-3 font-medium transition hover:brightness-110"
          >
            Voir le catalogue
          </Link>
          <Link
            href="/personnaliser"
            className="rounded-md border border-ash-gray px-5 py-3 transition hover:border-curse-violet"
          >
            Créer mon t-shirt
          </Link>
        </div>
      </section>

      {latest.length > 0 && (
        <section className="flex flex-col gap-6">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-3xl">Nouveautés</h2>
            <Link href="/catalogue" className="text-sm text-ghost-white/70 hover:text-curse-violet">
              Tout voir →
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {latest.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
