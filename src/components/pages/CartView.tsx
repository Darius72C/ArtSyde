"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { cart, cartSubtotal, SIZES, useCart, type CartItem } from "@/lib/cart";
import { formatFCFA, type Product } from "@/lib/products";
import { TEE_COLORS } from "@/lib/data";

const colorName = (hex: string) => TEE_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name ?? "Couleur libre";
import { ProductImage } from "../ProductImage";
import { FadeUp, RevealLines } from "../Reveal";
import { DUR, EASE, STAGGER } from "@/lib/motion";
import { flyToBin } from "@/lib/flyToBin";

export function Thumb({ item, className = "" }: { item: CartItem; className?: string }) {
  if (item.preview)
    return (
      <div className={`shrink-0 overflow-hidden bg-sand ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.preview} alt="" className="h-full w-full object-contain" />
      </div>
    );
  return <ProductImage color={item.color} art={item.art} photo={item.photo} bg={item.bg ?? "var(--sand)"} className={`shrink-0 ${className}`} zoom={false} />;
}

/** Small trash can whose lid lifts on hover (.bin-link in globals.css). Same drawing as flyToBin's bin. */
function BinIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-[18px] w-[18px] overflow-visible" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <g className="bin-lid">
        <path d="M9 13h30" />
        <path d="M19 13v-3a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3" />
      </g>
      <path d="M13 17l2 23a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3l2-23" />
      <path d="M20.5 23.5v12M27.5 23.5v12" />
    </svg>
  );
}

function Qty({ item }: { item: CartItem }) {
  return (
    <div className="flex items-center rounded-full border border-line">
      <button onClick={() => cart.setQty(item.key, item.qty - 1)} aria-label="Retirer un" className="h-9 w-9 text-lg font-extralight transition hover:bg-sand">−</button>
      <motion.span key={item.qty} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="w-8 text-center text-sm tabular-nums">
        {item.qty}
      </motion.span>
      <button onClick={() => cart.setQty(item.key, item.qty + 1)} aria-label="Ajouter un" className="h-9 w-9 text-lg font-extralight transition hover:bg-sand">+</button>
    </div>
  );
}

/** `products` (for the suggestions) come from the database, read by the /panier page. */
export function CartView({ products }: { products: Product[] }) {
  const items = useCart();
  const subtotal = cartSubtotal(items);
  const count = items.reduce((n, i) => n + i.qty, 0);
  const suggestions = products.filter((p) => !items.some((i) => i.productId === p.id)).slice(0, 4);

  return (
    <div className="mx-auto max-w-[1440px] px-5 md:px-10">
      <div className="pb-10 pt-14 md:pb-14 md:pt-20">
        <p className="eyebrow mb-5">{count} article{count > 1 ? "s" : ""}</p>
        <RevealLines as="h1" lines={["Ton panier."]} className="display text-5xl md:text-7xl" />
      </div>

      <AnimatePresence mode="wait">
        {items.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="tile px-8 py-16 text-center md:py-20">
            <p className="display text-4xl">Ton panier est vide.</p>
            <p className="mx-auto mt-4 max-w-md text-muted">Fais un tour dans la boutique, ou crée une pièce unique dans le studio 3D.</p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-8">
              <Link href="/#boutique" className="btn">La boutique</Link>
              <Link href="/studio" className="link-line">Le studio 3D <span className="arrow">›</span></Link>
            </div>
          </motion.div>
        ) : (
          <motion.div key="full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid items-start gap-12 lg:grid-cols-[1fr_380px] lg:gap-20">
            <ul className="border-t border-line">
              <AnimatePresence initial={false} mode="popLayout">
                {items.map((it, i) => (
                  <motion.li
                    key={it.key}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0, transition: { duration: DUR.slow, ease: EASE.out, delay: i * STAGGER.item } }}
                    exit={{ opacity: 0, scale: 0.97, transition: { duration: DUR.fast, ease: EASE.in } }}
                    className="flex gap-5 border-b border-line py-6 md:gap-8"
                  >
                    <Thumb item={it} className="aspect-[4/5] w-24 md:w-32" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-[19px] font-semibold">{it.name}</h3>
                          <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                            <span className="h-3 w-3 rounded-full ring-1 ring-line" style={{ background: it.color }} />
                            {it.productId === null ? `Création personnalisée · ${colorName(it.color)}` : colorName(it.color)}
                          </p>
                        </div>
                        <p className="text-sm tabular-nums">{formatFCFA(it.price * it.qty)}</p>
                      </div>
                      <div className="mt-auto flex flex-wrap items-center gap-5 pt-4">
                        <label className="flex items-center gap-2 text-sm">
                          <span className="text-muted">Taille</span>
                          <select value={it.size} onChange={(e) => cart.setSize(it.key, e.target.value)} className="rounded-lg border border-line bg-bg px-2 py-1 text-sm outline-none focus:border-accent">
                            {SIZES.map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        </label>
                        <Qty item={it} />
                        <button
                          onClick={(e) => {
                            // The item's picture flies into a bin that pops up, then the row goes.
                            flyToBin(e.currentTarget.closest("li")?.firstElementChild ?? null);
                            cart.remove(it.key);
                          }}
                          className="bin-link ml-auto inline-flex items-center gap-1.5 text-[15px] text-link hover:underline"
                        >
                          <BinIcon />
                          Retirer
                        </button>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>

            <motion.aside layout className="tile p-8 lg:sticky lg:top-20">
              <p className="text-[21px] font-semibold">Récapitulatif</p>
              <dl className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-muted">Sous-total</dt><dd className="tabular-nums">{formatFCFA(subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Livraison</dt><dd>Étape suivante</dd></div>
              </dl>
              <div className="mt-6 flex items-baseline justify-between border-t border-line pt-6">
                <span className="font-semibold">Total</span>
                <motion.span key={subtotal} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} className="display text-3xl tabular-nums">{formatFCFA(subtotal)}</motion.span>
              </div>
              <Link href="/commande" className="btn mt-8 w-full">Passer commande</Link>
              <Link href="/#boutique" className="mt-5 block text-center text-sm text-muted underline-offset-4 hover:text-ink hover:underline">Continuer mes achats</Link>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {suggestions.length > 0 && (
        <section className="py-24">
                    <RevealLines lines={[{ text: "Tu vas aimer.", muted: "Pour compléter." }]} className="display text-4xl md:text-5xl" />
          <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
            {suggestions.map((p, i) => (
              <FadeUp key={p.id} delay={i * STAGGER.item} className="group">
                <div className="relative">
                  <ProductImage color={p.colors[0]} art={p.art} photo={p.photo} alt={p.name} bg={p.bg} className="aspect-[4/5] rounded-[22px]" />
                  <button
                    onClick={() => cart.add({ productId: p.id, name: p.name, price: p.price, color: p.colors[0], size: p.sizes.includes("M") ? "M" : (p.sizes[0] ?? "M"), art: p.art, bg: p.bg, photo: p.photo })}
                    className="btn absolute bottom-4 left-1/2 -translate-x-1/2 !px-4 !py-1.5 !text-[14px] transition md:opacity-0 md:group-hover:opacity-100"
                  >
                    Ajouter — M
                  </button>
                </div>
                <div className="mt-4 flex justify-between gap-3">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm">{formatFCFA(p.price)}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
