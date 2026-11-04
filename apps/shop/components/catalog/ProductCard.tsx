import Image from "next/image";
import Link from "next/link";
import { formatXof } from "@/lib/format";
import type { ProductCardData } from "@/lib/products";

/** Carte produit : le design sur la couleur principale, le nom, le prix et les couleurs. */
export function ProductCard({ product }: { product: ProductCardData }) {
  const mainColor = product.colors[0] ?? "#000000";

  return (
    <Link
      href={`/produits/${product.slug}`}
      className="group flex flex-col gap-3 rounded-xl border border-ash-gray p-3 transition hover:border-curse-violet"
    >
      <div
        className="relative aspect-square overflow-hidden rounded-lg"
        style={{ backgroundColor: mainColor }}
      >
        <Image
          src={product.designUrl}
          alt={product.name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-contain p-8 transition duration-300 group-hover:scale-105"
        />
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
