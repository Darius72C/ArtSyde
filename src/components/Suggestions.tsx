"use client";

import Link from "next/link";
import { cart } from "@/lib/cart";
import { available, defaultSize } from "@/lib/stock";
import { formatFCFA, productHref, type Product } from "@/lib/products";
import { STAGGER } from "@/lib/motion";
import { ProductImage } from "./ProductImage";
import { FadeUp, RevealLines } from "./Reveal";

/** "Tu vas aimer.": up to four products, each opening its page, with a quick add in size M. Used by the cart and the product page. */
export function Suggestions({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <section className="py-24">
      <RevealLines lines={[{ text: "Tu vas aimer.", muted: "Pour compléter." }]} className="display text-4xl md:text-5xl" />
      <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
        {products.slice(0, 4).map((p, i) => (
          <FadeUp key={p.id} delay={i * STAGGER.item} className="group">
            <div className="relative">
              {/* The name below is the keyboard's link; the picture is the same link for the mouse. */}
              <Link href={productHref(p)} tabIndex={-1} aria-hidden className="block">
                <ProductImage color={p.colors[0]} art={p.art} photo={p.photo} alt={p.name} bg={p.bg} className="aspect-[4/5] rounded-[22px]" />
              </Link>
              {p.sizes.some((s) => available(p.stock, p.colors[0], s) > 0) && (
                <button
                  onClick={() => cart.add({ productId: p.id, name: p.name, price: p.price, color: p.colors[0], size: defaultSize(p.stock, p.colors[0], p.sizes), art: p.art, bg: p.bg, photo: p.photo })}
                  className="btn absolute bottom-4 left-1/2 -translate-x-1/2 !px-4 !py-1.5 !text-[14px] transition md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                >
                  Ajouter — {defaultSize(p.stock, p.colors[0], p.sizes)}
                </button>
              )}
            </div>
            <div className="mt-4 flex justify-between gap-3">
              <Link href={productHref(p)} className="font-semibold underline-offset-4 hover:underline">{p.name}</Link>
              <p className="text-sm">{formatFCFA(p.price)}</p>
            </div>
          </FadeUp>
        ))}
      </div>
    </section>
  );
}
