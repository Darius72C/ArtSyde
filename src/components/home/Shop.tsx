"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { cart } from "@/lib/cart";
import { flyToCart } from "@/lib/flyToCart";
import { formatFCFA, type Product } from "@/lib/products";
import { ProductImage } from "../ProductImage";
import { RevealLines, Tilt } from "../Reveal";
import { DUR, EASE, SPRING, STAGGER, VIEWPORT } from "@/lib/motion";

const TABS = [
  { id: "all", label: "Tout" },
  { id: "Nouveau", label: "Nouveautés" },
  { id: "Best-seller", label: "Best-sellers" },
  { id: "Promo", label: "Offres" },
] as const;
type Tab = (typeof TABS)[number]["id"];
function Card({ p, i, onAdd }: { p: Product; i: number; onAdd: (p: Product, color: string, from: Element | null) => void }) {
  const [color, setColor] = useState(p.colors[0]);
  const art = useRef<HTMLDivElement>(null);
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 60, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={VIEWPORT}
      exit={{ opacity: 0, scale: 0.9, filter: "blur(4px)", transition: { duration: DUR.instant, ease: EASE.in } }}
      transition={{ duration: DUR.slow, ease: EASE.out, delay: (i % 4) * STAGGER.item }}
      className="group"
    >
      <Tilt className="tile flex h-full flex-col p-5 md:p-6" max={6}>
      <div className="flex h-5 items-center justify-between">
        {p.tag ? <span className="eyebrow !text-[12px]">{p.tag === "Promo" ? "Offre" : p.tag}</span> : <span />}
      </div>
      {/* Colour swap: the old tee fades out while the new one settles in. */}
      <div ref={art} className="relative my-4 aspect-square" style={{ transform: "translateZ(30px)" }}>
        <AnimatePresence initial={false}>
          <motion.div
            key={color}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.92, rotate: -3 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: DUR.base, ease: EASE.out }}
          >
            <ProductImage color={color} art={p.art} photo={p.photo} alt={p.name} bg="transparent" className="h-full w-full rounded-[22px]" />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex justify-center gap-2">
        {p.colors.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            aria-label={`Couleur ${c}`}
            aria-pressed={c === color}
            className={`h-4 w-4 rounded-full ring-1 ring-offset-2 ring-offset-surface transition duration-300 hover:scale-125 active:scale-90 ${c === color ? "scale-110 ring-ink" : "ring-ink/25 hover:ring-muted"}`}
            style={{ background: c }}
          />
        ))}
      </div>
      <h3 className="display mt-4 text-center text-[21px]">{p.name}</h3>
      <p className="mt-1 text-center text-[15px]">
        {formatFCFA(p.price)} {p.oldPrice && <span className="text-muted line-through">{formatFCFA(p.oldPrice)}</span>}
      </p>
      <button onClick={() => onAdd(p, color, art.current)} className="btn mx-auto mt-4 !px-5 !py-2 !text-[14px]">
        Ajouter au panier
      </button>
      </Tilt>
    </motion.article>
  );
}

/** `products` come from the database (src/server/catalog.ts), read by the home page. */
export function Shop({ products }: { products: Product[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const list = tab === "all" ? products : products.filter((p) => p.tag === tab);

  const add = (p: Product, color: string, from: Element | null) => {
    flyToCart(from);
    cart.add({ productId: p.id, name: p.name, price: p.price, color, size: p.sizes.includes("M") ? "M" : (p.sizes[0] ?? "M"), art: p.art, bg: p.bg, photo: p.photo });
    setToast(p.name);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2600);
  };

  return (
    <section id="boutique" className="mx-auto max-w-[1180px] px-5 py-20 md:py-28">
      <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <RevealLines lines={[{ text: "Tous les t-shirts.", muted: "Choisis le tien." }]} className="display max-w-2xl text-[clamp(2rem,4.5vw,3.25rem)]" />
        <LayoutGroup>
          <div className="flex rounded-full bg-surface p-1" role="tablist">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className="relative rounded-full px-4 py-1.5 text-[14px]">
                {tab === t.id && <motion.span layoutId="seg" className="absolute inset-0 rounded-full bg-bg shadow-[0_1px_4px_rgba(0,0,0,0.12)]" transition={SPRING.snappy} />}
                <span className={`relative ${tab === t.id ? "font-medium" : "text-muted"}`}>{t.label}</span>
              </button>
            ))}
          </div>
        </LayoutGroup>
      </div>
      <motion.div layout className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <AnimatePresence mode="popLayout">
          {list.map((p, i) => (
            <Card key={p.id} p={p} i={i} onAdd={add} />
          ))}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={SPRING.snappy}
            className="fixed right-4 top-16 z-50 flex items-center gap-4 rounded-2xl border border-line/60 bg-[var(--nav)] px-5 py-3.5 text-[15px] shadow-[0_10px_40px_rgba(0,0,0,0.15)] backdrop-blur-xl"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-ok text-[13px] text-white">✓</span>
            <span>
              <b className="font-semibold">{toast}</b> ajouté au panier
            </span>
            <Link href="/panier" className="link-line !text-[15px]">
              Voir <span className="arrow">›</span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
