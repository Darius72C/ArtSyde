import Image from "next/image";
import Link from "next/link";
import { formatXof } from "@/lib/format";
import type { ProductCardData } from "@/lib/products";

const IMAGE_SIZES = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw";

/**
 * Carte produit : le mockup du t-shirt (ou, s'il n'y en a pas encore, le
 * design sur la couleur principale), puis le nom, le prix et les couleurs.
 * Le t-shirt 3D interactif est réservé à la fiche produit.
 */
export function ProductCard({ product }: { product: ProductCardData }) {
  const mockup = product.mockups[0];
  const mainColor = product.colors[0] ?? "#000000";

  return (
    <Link
      href={`/produits/${product.slug}`}
      className="group flex flex-col gap-3 rounded-xl border border-ash-gray p-3 transition hover:border-curse-violet"
    >
      <div
        className="relative aspect-square overflow-hidden rounded-lg bg-ash-gray/25"
        style={mockup ? undefined : { backgroundColor: mainColor }}
      >
        {mockup ? (
          <Image
            src={mockup}
            alt={product.name}
            fill
            sizes={IMAGE_SIZES}
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <Image
            src={product.designUrl}
            alt={product.name}
            fill
            sizes={IMAGE_SIZES}
            className="object-contain p-8 transition duration-300 group-hover:scale-105"
          />
        )}
        <span className="absolute bottom-2 right-2 rounded-md bg-curse-black/80 px-2 py-1 text-xs text-ghost-white/80 opacity-0 transition group-hover:opacity-100">
          Voir en 3D
        </span>
      </div>
      <div className="flex items-start justify-between gap-3 text-left">
        <div className="min-w-0">
          <h3 className="truncate font-medium">{product.name}</h3>
          <p className="text-sm text-ghost-white/70">{formatXof(product.priceXof)}</p>
        </div>
        <div className="flex shrink-0 gap-1 pt-1" aria-label={`${product.colors.length} couleurs`}>
          {product.colors.slice(0, 4).map((c) => (
            <span
              key={c}
              className="size-3.5 rounded-full border border-white/20"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </Link>
  );
}
