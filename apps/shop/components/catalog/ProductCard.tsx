"use client";

import { useState } from "react";
import Link from "next/link";
import { TshirtTurntable } from "@/components/tshirt/TshirtTurntable";
import { formatXof } from "@/lib/format";
import type { ProductCardData } from "@/lib/products";

/**
 * Carte produit : le t-shirt en 3D qui tourne sur lui-même, dans sa couleur
 * principale, puis le nom, le prix et les couleurs disponibles.
 * Au survol, la rotation accélère.
 */
export function ProductCard({ product }: { product: ProductCardData }) {
  const [hovered, setHovered] = useState(false);
  const mainColor = product.colors[0] ?? "#000000";

  return (
    <Link
      href={`/produits/${product.slug}`}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className="group flex flex-col gap-3 rounded-xl border border-ash-gray p-3 transition hover:border-curse-violet"
    >
      <div className="relative aspect-square overflow-hidden rounded-lg bg-ash-gray/25">
        <TshirtTurntable
          color={mainColor}
          designUrl={product.designUrl}
          hovered={hovered}
          className="absolute inset-0"
        />
        <span className="sr-only">{product.name}, t-shirt en 3D</span>
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
