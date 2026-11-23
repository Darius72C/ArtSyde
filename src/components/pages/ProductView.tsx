"use client";

import Link from "@/components/LocaleLink";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { cart } from "@/lib/cart";
import { available, defaultSize } from "@/lib/stock";
import { flyToCart } from "@/lib/flyToCart";
import { DELIVERY, DELIVERY_METHODS } from "@/lib/orders";
import { PRINT_SIDES, formatFCFA, productHref, type Product } from "@/lib/products";
import { PRODUCTION_URL } from "@/lib/site";
import { loadPrint } from "@/lib/printImages";
import { colorLabel } from "@/lib/admin/labels";
import { COMPANY, whatsappWith } from "@/lib/company";
import { PAYMENT_METHODS, PAYMENT_METHOD_IDS } from "@/lib/credits";
import { WhatsAppMark } from "../WhatsAppButton";
import { SizeHelper } from "../SizeHelper";
import { ShareProduct } from "../ShareProduct";
import { wornSnapshot } from "../story/snapshot";
import { shareOrDownload, wornShareCard } from "@/lib/shareCard";
import { track } from "@/lib/metrics";
import { DUR, EASE, SPRING } from "@/lib/motion";
import { ProductImage } from "../ProductImage";
import { RevealLines } from "../Reveal";
import { Suggestions } from "../Suggestions";
import { useHref, useLocale, useT } from "../I18nProvider";

const sectionTitle = "border-b border-line pb-4 text-[24px] font-semibold tracking-[-0.02em]";
const MAX_QTY = 20; // same cap as the cart

type View = "photos" | "mockup" | "3d" | "worn";
const VIEW_LABEL: Record<View, string> = { photos: "Photos", mockup: "Mockup", "3d": "3D", worn: "Porté" };
const PICTURE: Record<View, string> = { photos: "photo", mockup: "mockup", "3d": "vue 3D", worn: "vue portée" };
const PICTURE_EN: Record<View, string> = { photos: "photo", mockup: "mockup", "3d": "3D view", worn: "worn view" };
// three.js stays out of the page's first load: the 3D t-shirt (code, model, print images) is fetched
// once the page is idle, so it's ready when its tab is opened.
const loadTee3D = () => import("../ProductTee3D");
const ProductTee3D = dynamic(loadTee3D, { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-surface" /> });
// The "Porté" tab: the tee on a shop mannequin, in the size chosen on the page. Loaded only when opened.
const loadWorn = () => import("../MannequinTryOn");
const preloadWorn = () => void loadWorn().then((m) => m.preloadMannequin());
/** A phone with little memory, or data saving on: heavy 3D waits until asked. */
const isLiteDevice = () => {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  return (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) || Boolean(nav.connection?.saveData);
};
const MannequinTryOn = dynamic(loadWorn, { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-surface" /> });

/** A product's own page (/boutique/[slug]). `others` (the suggestions) come from the same catalogue. */
export function ProductView({ product: p, others }: { product: Product; others: Product[] }) {
  const t = useT();
  const href = useHref();
  const locale = useLocale();
  const pictureName = (v: View) => (locale === "en" ? PICTURE_EN : PICTURE)[v];
  const [color, setColor] = useState(p.colors[0]);
  const [size, setSize] = useState(() => defaultSize(p.stock, p.colors[0], p.sizes));
  const [qty, setQty] = useState(1);
  const views: View[] = p.flats.length ? ["photos", "mockup", "3d", "worn"] : ["photos", "3d", "worn"];
  const [view, setView] = useState<View>("photos");
  const [wornZoomed, setWornZoomed] = useState(false); // the "Porté" view is zoomed: two fingers also move it
  const [shown, setShown] = useState(0); // which picture of the tab is large
  const [added, setAdded] = useState(false);
  const art = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const printKey = PRINT_SIDES.map((s) => p.print3d[s]?.url ?? "").join("|");
  useEffect(() => {
    for (const url of printKey.split("|")) if (url) loadPrint(url);
    const idle = window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 1500));
    idle(() => void loadTee3D().then(() => !isLiteDevice() && idle(preloadWorn))); // then the default mannequin of the "Porté" tab
  }, [printKey]);

  const pictures = view === "photos" ? p.photos : view === "mockup" ? p.flats : [];
  const picture = pictures[shown];
  const show = (v: View) => {
    setView(v);
    setShown(0);
    if (v === "worn") track("worn.open");
  };
  useEffect(() => track("product.view"), [p.id]);
  // Light mode: on a phone with little memory or with data saving on, the 3D mannequin loads only when asked.
  const [lite, setLite] = useState(false);
  const [want3d, setWant3d] = useState(false);
  useEffect(() => {
    if (!isLiteDevice()) return;
    const id = requestAnimationFrame(() => setLite(true));
    return () => cancelAnimationFrame(id);
  }, []);
  // A link with ?vue=porte (shared, or "Voir porté" in the shop) opens the worn view.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("vue") !== "porte") return;
    track("worn.open");
    const id = requestAnimationFrame(() => setView("worn"));
    return () => cancelAnimationFrame(id);
  }, []);
  // Share the worn view: the mannequin on the studio backdrop, with the name and price, to WhatsApp, Instagram…
  const [sharing, setSharing] = useState<"idle" | "busy" | "done">("idle");
  const shareWorn = async () => {
    if (!wornSnapshot.current || sharing === "busy") return;
    setSharing("busy");
    try {
      const front = await wornSnapshot.current(1000, "front");
      const back = await wornSnapshot.current(1000, "back");
      if (!front || !back) throw new Error("no render");
      const link = `${PRODUCTION_URL}${href(productHref(p))}?vue=porte`;
      const card = await wornShareCard({ front, back, photo: p.photo ?? p.photos[0], title: p.name, price: formatFCFA(p.price), sizes: t("Tailles {sizes}", { sizes: p.sizes.join(", ") }), link, labels: { front: t("Devant"), back: t("Dos"), scan: t("Scanne pour le commander") } });
      const res = await shareOrDownload(card, `artsyde-${p.slug}-porte.png`, t("{name} sur ArtSyde : {link}", { name: p.name, link }));
      setSharing(res === "cancelled" ? "idle" : "done");
      if (res !== "cancelled") track("worn.share");
      if (res !== "cancelled") window.setTimeout(() => setSharing("idle"), 2500);
    } catch (err) {
      console.error("Share failed", err);
      setSharing("idle");
    }
  };

  // Blank t-shirts left in this colour and size (Infinity when the colour isn't tracked in the stock).
  const left = available(p.stock, color, size);
  const soldOut = left <= 0;
  const maxQty = Math.min(MAX_QTY, left);

  function add() {
    if (soldOut) return;
    flyToCart(art.current);
    track("cart.add");
    cart.add({ productId: p.id, name: p.name, price: p.price, color, size, qty, art: p.art, bg: p.bg, photo: p.photo });
    setAdded(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 2600);
  }

  return (
    <div className="mx-auto max-w-[1440px] px-5 md:px-10">
      <div className="pb-10 pt-14 md:pt-20">
        <p className="eyebrow mb-5">{t(p.tag === "Promo" ? "Offre" : (p.tag ?? "T-shirt"))}</p>
        <RevealLines as="h1" lines={[p.name]} className="display text-5xl md:text-7xl" />
      </div>

      {/* On a phone: pictures, then the purchase panel, then the details. On desktop the panel sits on the right of both. */}
      {/* Bottom space: the suggestions bring their own; with none, the page keeps the usual pb-24. */}
      <div className={`grid items-start gap-14 lg:grid-cols-[1fr_400px] lg:gap-x-20 lg:gap-y-16 ${others.length ? "" : "pb-24"}`}>
        {/* Pictures in tabs: Photos (the admin's photos, or the illustration in the chosen colour), Mockup (flat mockups, when there are some), 3D, and Porté (on a mannequin). */}
        <section aria-label={t("Images")} className="lg:col-start-1">
          <LayoutGroup id="product-views">
            <div className="mb-4 flex w-fit rounded-full bg-surface p-1" role="tablist" aria-label={t("Voir le t-shirt")}>
              {views.map((v) => (
                <button key={v} id={`view-${v}`} type="button" role="tab" aria-selected={view === v} aria-controls="product-view" onClick={() => show(v)} onPointerEnter={v === "worn" ? preloadWorn : undefined} onPointerDown={v === "worn" ? preloadWorn : undefined} onFocus={v === "worn" ? preloadWorn : undefined} className="relative rounded-full px-4 py-1.5 text-[14px]">
                  {view === v && <motion.span layoutId="seg" className="absolute inset-0 rounded-full bg-bg shadow-[0_1px_4px_rgba(0,0,0,0.12)]" transition={SPRING.snappy} />}
                  <span className={`relative whitespace-nowrap ${view === v ? "font-medium" : "text-muted"}`}>{t(VIEW_LABEL[v])}</span>
                </button>
              ))}
            </div>
          </LayoutGroup>
          <div ref={art} id="product-view" role="tabpanel" aria-labelledby={`view-${view}`} className="relative aspect-[4/5] overflow-hidden rounded-[22px] md:aspect-[5/4]" style={{ background: p.bg }}>
            <AnimatePresence initial={false}>
              <motion.div
                key={view === "3d" || view === "worn" ? view : `${view}-${picture ?? color}`}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: DUR.base, ease: EASE.out }}
              >
                {view === "3d" ? (
                  <ProductTee3D color={color} print={p.print3d} className="h-full w-full" />
                ) : view === "worn" ? (
                  lite && !want3d ? (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center">
                      <ProductImage color={color} art={p.art} photo={p.photo} alt={p.name} bg="transparent" className="aspect-square w-1/2 rounded-[22px]" zoom={false} />
                      <p className="max-w-xs text-sm text-muted">{t("Mode économie de données : le mannequin en 3D se charge seulement si tu le demandes.")}</p>
                      <button type="button" onClick={() => setWant3d(true)} className="btn !px-5 !py-2 text-sm">{t("Voir le mannequin en 3D (≈ 0,5 Mo)")}</button>
                    </div>
                  ) : (
                    <MannequinTryOn color={color} print={p.print3d} size={size} className="h-full w-full" onZoomChange={setWornZoomed} />
                  )
                ) : (
                  <ProductImage color={color} art={p.art} photo={picture} alt={`${p.name}, ${pictureName(view)} ${shown + 1}`} bg="transparent" className="h-full w-full" zoom={false} fit="contain" />
                )}
              </motion.div>
            </AnimatePresence>
            {view === "worn" && !(lite && !want3d) && (
              <button type="button" onClick={shareWorn} disabled={sharing === "busy"} className="absolute left-3 top-3 flex h-9 items-center gap-1.5 rounded-full bg-bg/85 px-3.5 text-sm text-ink shadow-[0_1px_4px_rgba(0,0,0,0.12)] disabled:opacity-60">
                {sharing === "busy" ? t("Préparation…") : sharing === "done" ? t("Prêt ✓") : (
                  <>
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></svg>
                    {t("Partager")}
                  </>
                )}
              </button>
            )}
            {view === "worn" && <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-bg/85 px-3 py-1 text-sm text-muted">{t("Taille {size}", { size })} · {wornZoomed ? t("glisse pour tourner · 2 doigts pour bouger") : t("fais glisser pour tourner")}</p>}
            {view === "3d" && <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-bg/85 px-3 py-1 text-sm text-muted">{t("Fais glisser pour tourner le t-shirt")}</p>}
          </div>
          {pictures.length > 1 && (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {pictures.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setShown(i)}
                  aria-label={t("{what} {i} sur {n}", { what: pictureName(view), i: i + 1, n: pictures.length })}
                  aria-pressed={i === shown}
                  className={`shrink-0 overflow-hidden rounded-2xl border transition-colors ${i === shown ? "border-accent shadow-[0_0_0_1px_var(--accent)]" : "border-line hover:border-muted"}`}
                >
                  <ProductImage color={color} photo={src} alt="" bg={p.bg} className="aspect-[4/5] w-20" zoom={false} />
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="tile p-8 lg:sticky lg:top-20 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[21px] font-semibold">{t("Ton t-shirt")}</p>
          </div>
          <div className="mt-3">
            <ShareProduct name={p.name} price={formatFCFA(p.price)} slug={p.slug} url={`${PRODUCTION_URL}${href(productHref(p))}`} />
          </div>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">{t("Prix")}</dt>
              <dd className="tabular-nums">
                {p.oldPrice && <span className="mr-2 text-muted line-through">{formatFCFA(p.oldPrice)}</span>}
                {formatFCFA(p.price)}
              </dd>
            </div>
          </dl>

          <div className="mt-6 border-t border-line pt-6">
            <p className="text-sm">
              <span className="text-muted">{t("Couleur")}</span> · {t(colorLabel(color))}
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {p.colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setColor(c);
                    setShown(0);
                    // Keep the size if it's in stock in the new colour, else pick one that is.
                    if (available(p.stock, c, size) <= 0) setSize(defaultSize(p.stock, c, p.sizes));
                    setQty((q) => Math.max(1, Math.min(q, MAX_QTY, available(p.stock, c, size))));
                  }}
                  aria-label={t("Couleur {c}", { c: t(colorLabel(c)) })}
                  aria-pressed={c === color}
                  className={`h-7 w-7 rounded-full ring-1 ring-offset-2 ring-offset-surface transition duration-300 hover:scale-110 active:scale-90 ${c === color ? "scale-110 ring-ink" : "ring-ink/25 hover:ring-muted"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm text-muted">{t("Taille")}</p>
            <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("Taille")}>
              {p.sizes.map((s) => {
                const on = s === size;
                const out = available(p.stock, color, s) <= 0;
                return (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-disabled={out}
                    aria-label={out ? t("{s}, épuisé", { s }) : s}
                    key={s}
                    onClick={() => {
                      if (out) return;
                      setSize(s);
                      setQty((q) => Math.max(1, Math.min(q, MAX_QTY, available(p.stock, color, s))));
                    }}
                    className={`relative rounded-2xl border py-3 text-[15px] font-semibold transition-colors ${out ? "cursor-not-allowed border-line text-muted line-through opacity-60" : on ? "border-accent shadow-[0_0_0_1px_var(--accent)]" : "border-line hover:border-muted"}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
            <SizeHelper
              sizes={p.sizes.filter((s) => available(p.stock, color, s) > 0)}
              current={size}
              onPick={(s) => {
                track("size.advice");
                setSize(s);
                setQty((q) => Math.max(1, Math.min(q, MAX_QTY, available(p.stock, color, s))));
              }}
            />
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-muted">{t("Quantité")}</p>
            <div className="flex items-center rounded-full border border-line">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label={t("Retirer un")} className="h-9 w-9 text-lg font-extralight transition hover:bg-sand disabled:opacity-40">−</button>
              <motion.span key={qty} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: DUR.instant, ease: EASE.out }} className="w-8 text-center text-sm tabular-nums" aria-live="polite">
                {qty}
              </motion.span>
              <button type="button" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty} aria-label={t("Ajouter un")} className="h-9 w-9 text-lg font-extralight transition hover:bg-sand disabled:opacity-40">+</button>
            </div>
          </div>

          <div className="mt-6 flex items-baseline justify-between border-t border-line pt-6">
            <span className="font-semibold">{t("Total")}</span>
            <motion.span key={p.price * qty} initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ duration: DUR.fast, ease: EASE.out }} className="display text-3xl tabular-nums">{formatFCFA(p.price * qty)}</motion.span>
          </div>

          {left < Infinity && left > 0 && left <= 5 && <p className="mt-4 text-sm font-medium text-new">{t("Plus que {left} en {size} dans cette couleur.", { left, size })}</p>}
          <button type="button" onClick={add} disabled={soldOut} className="btn mt-8 w-full">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={soldOut ? "out" : added ? "done" : "add"} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: DUR.instant, ease: EASE.out }}>
                {soldOut ? t("Épuisé dans cette couleur") : added ? t("Ajouté au panier ✓") : t("Ajouter au panier")}
              </motion.span>
            </AnimatePresence>
          </button>
          <p role="status" className="sr-only">{added ? t("{name} ajouté au panier", { name: p.name }) : ""}</p>
          {added ? (
            <Link href="/panier" className="mt-5 block text-center text-sm text-muted underline-offset-4 hover:text-ink hover:underline">{t("Voir mon panier")}</Link>
          ) : (
            <Link href="/#boutique" className="mt-5 block text-center text-sm text-muted underline-offset-4 hover:text-ink hover:underline">{t("Continuer mes achats")}</Link>
          )}

          {/* What people ask before buying: delivery, payment, and a question to the shop with the product filled in. */}
          <div className="mt-6 space-y-3 border-t border-line pt-6 text-sm">
            <p className="flex gap-3">
              <span aria-hidden>🚚</span>
              <span>
                {t("Imprimé à la commande, prêt en 1 à 2 jours ouvrés. Livraison {express} ({expressPrice}) ou {standard} ({standardPrice}), retrait à l'atelier gratuit.", { express: t(DELIVERY.EXPRESS.note), expressPrice: formatFCFA(DELIVERY.EXPRESS.price), standard: t(DELIVERY.STANDARD.note), standardPrice: formatFCFA(DELIVERY.STANDARD.price) })}{" "}
                <Link href="/livraison" className="text-muted underline underline-offset-4 hover:text-ink">{t("Détails")}</Link>
              </span>
            </p>
            <p className="flex gap-3">
              <span aria-hidden>💳</span>
              <span>{t("Paiement {methods}.", { methods: PAYMENT_METHOD_IDS.map((m) => t(PAYMENT_METHODS[m])).join(", ").replace(/, ([^,]*)$/, ` ${t("ou")} $1`) })}</span>
            </p>
            {(COMPANY.whatsappNumber || COMPANY.whatsapp) && (
              <a
                href={whatsappWith(t("Bonjour ArtSyde ! J'ai une question sur le t-shirt « {name} » ({color}, taille {size}) : {url}", { name: p.name, color: t(colorLabel(color)).toLowerCase(), size, url: `${PRODUCTION_URL}${href(productHref(p))}` }))}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("whatsapp.question")}
                className="flex items-center gap-3 font-medium text-[#128C7E] hover:underline"
              >
                <WhatsAppMark className="h-5 w-5" />
                {t("Une question sur ce t-shirt ? Écris-nous")}
              </a>
            )}
          </div>
        </aside>

        <div className="space-y-16 lg:col-start-1">
          <section>
            <p className={sectionTitle}>{t("Description")}</p>
            <p className="mt-6 max-w-2xl leading-relaxed text-muted">
              {p.description || t("Une coupe oversize aux épaules tombantes, dans un coton épais et souple. Imprimé, contrôlé et plié dans notre atelier.")}
            </p>
          </section>

          <section>
            <p className={sectionTitle}>{t("Détails")}</p>
            <dl className="mt-6 max-w-2xl space-y-3 text-sm">
              <div className="flex justify-between gap-6"><dt className="text-muted">{t("Coupe")}</dt><dd className="text-right">{t("Oversize, épaules tombantes")}</dd></div>
              <div className="flex justify-between gap-6"><dt className="text-muted">{t("Matière")}</dt><dd className="text-right">{t("Coton épais et souple")}</dd></div>
              <div className="flex justify-between gap-6"><dt className="text-muted">{t("Impression")}</dt><dd className="text-right">{t("DTF, dans notre atelier")}</dd></div>
              <div className="flex justify-between gap-6"><dt className="text-muted">{t("Tailles")}</dt><dd className="text-right">{p.sizes.join(", ")}</dd></div>
            </dl>
          </section>

          <section>
            <p className={sectionTitle}>{t("Livraison")}</p>
            <dl className="mt-6 max-w-2xl space-y-3 text-sm">
              {DELIVERY_METHODS.map((d) => (
                <div key={d} className="flex justify-between gap-6">
                  <dt>
                    {t(DELIVERY[d].label)}
                    <span className="block text-muted">{t(DELIVERY[d].note)}</span>
                  </dt>
                  <dd className="text-right tabular-nums">{DELIVERY[d].price ? formatFCFA(DELIVERY[d].price) : t("Offert")}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>

      <Suggestions products={others} />
    </div>
  );
}
