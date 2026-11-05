"use server";

import { db } from "@/server/db";
import { Prisma, Size } from "@/generated/prisma/client";
import { DELIVERY, DELIVERY_METHODS, checkFields, orderKey, type CheckoutInput, type PlaceOrderResult } from "@/lib/orders";
import { STUDIO_PRICE } from "@/lib/products";
import { PRINT_QUALITIES, type PrintQuality } from "@/lib/studio";
import { available } from "@/lib/stock";
import { readStockNow } from "@/server/stock";
import { customerFor } from "@/server/account";
import { keyFromPublicUrl, r2Config } from "@/server/r2";
import { logActivity, logError } from "@/server/log";
import { onlinePaymentEnabled } from "@/server/payments/geniuspay";
import { startOrderPayment } from "@/server/payments/settle";
import { PAYMENT_METHOD_IDS } from "@/lib/credits";
import { evaluatePromo } from "@/server/promo-rules";

/** A studio piece's print files: only links to our own storage (designs/), one per side at most. */
function printFiles(files: unknown, quality: PrintQuality): Prisma.CustomDesignCreateWithoutOrderItemInput[] {
  const cfg = r2Config();
  if (!cfg || !Array.isArray(files)) return [];
  const out: Prisma.CustomDesignCreateWithoutOrderItemInput[] = [];
  for (const f of files.slice(0, 2)) {
    const side = f?.side === "front" || f?.side === "back" ? (f.side as "front" | "back") : null;
    const url = typeof f?.url === "string" ? f.url : "";
    if (!side || out.some((o) => (o.placement as { side?: string }).side === side)) continue;
    if (!keyFromPublicUrl(cfg, url)?.startsWith("designs/")) continue;
    out.push({
      layer: side === "front" ? 0 : 1,
      fileUrl: url,
      fileName: `${side === "front" ? "devant" : "dos"}-${quality.toLowerCase()}.png`,
      mimeType: "image/png",
      placement: { side, quality },
    });
  }
  return out;
}

/*
 * Places an order from the checkout. Anyone can POST here, so nothing from the browser is
 * trusted beyond "which t-shirt, which colour, which size, how many": prices and totals are
 * recomputed from the Product table (active products only). The order waits for payment (PENDING_PAYMENT / UNPAID).
 */

const HEX = /^#[0-9a-f]{6}$/i;
const MAX_LINES = 30;
const MAX_QTY = 20;
const MAX_PREVIEW = 200_000; // the studio's 220×220 PNG thumbnail, as a data URL
const STUDIO_PRICES: number[] = [STUDIO_PRICE.base, STUDIO_PRICE.base + STUDIO_PRICE.back];

const CART_CHANGED = "Ton panier a changé entre-temps. Repasse par le panier, puis valide à nouveau.";
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function placeOrder(input: CheckoutInput): Promise<PlaceOrderResult> {
  const f = input?.fields ?? {};
  const fields = { name: str(f.name, 120), phone: str(f.phone, 30), email: str(f.email, 160), city: str(f.city, 120), address: str(f.address, 300), notes: str(f.notes, 500) };
  const delivery = DELIVERY_METHODS.find((d) => d === input?.delivery);
  if (!delivery) return { ok: false, errors: {}, message: "Choisis un mode de livraison." };
  const errors = checkFields(fields, delivery);
  if (Object.keys(errors).length) return { ok: false, errors };

  const lines = Array.isArray(input.lines) ? input.lines : [];
  if (lines.length === 0 || lines.length > MAX_LINES) return { ok: false, errors: {}, message: CART_CHANGED };

  // The catalogue lines' products, read once. Prices, colours and sizes come from here.
  const ids = [...new Set(lines.flatMap((l) => (typeof l?.productId === "string" ? [l.productId] : [])))];
  let catalogue: { id: string; priceXof: number; colors: string[]; sizes: Size[] }[] = [];
  try {
    catalogue = ids.length ? await db.product.findMany({ where: { id: { in: ids }, active: true }, select: { id: true, priceXof: true, colors: true, sizes: true } }) : [];
  } catch (e) {
    await logError("placeOrder: catalogue read", e);
    return { ok: false, errors: {}, message: "On n'a pas pu enregistrer ta commande. Réessaie dans un instant." };
  }

  // Recompute every line from the catalogue.
  const items: { productId: string | null; size: Size; color: string; quantity: number; unitPriceXof: number; previewUrl: string | null; printQuality: PrintQuality | null; customDesigns?: { create: Prisma.CustomDesignCreateWithoutOrderItemInput[] } }[] = [];
  for (const l of lines) {
    const size = Object.values(Size).find((s) => s === l?.size);
    const quantity = Number(l?.qty);
    const color = typeof l?.color === "string" ? l.color : "";
    if (!size || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) return { ok: false, errors: {}, message: CART_CHANGED };

    if (l.productId === null) {
      // Studio piece: front only, or front and back, with its print files.
      const price = Number(l.price);
      if (!HEX.test(color) || !STUDIO_PRICES.includes(price)) return { ok: false, errors: {}, message: CART_CHANGED };
      const preview = typeof l.preview === "string" && l.preview.startsWith("data:image/") && l.preview.length <= MAX_PREVIEW ? l.preview : null;
      const printQuality = PRINT_QUALITIES.find((q) => q === l.quality) ?? "STANDARD";
      // The print files sent from the studio (front, back): the workshop prints from these.
      const designs = printFiles(l.files, printQuality);
      items.push({ productId: null, size, color, quantity, unitPriceXof: price, previewUrl: preview, printQuality, ...(designs.length ? { customDesigns: { create: designs } } : {}) });
    } else {
      const p = catalogue.find((x) => x.id === l.productId);
      const known = p?.colors.find((c) => c.toLowerCase() === color.toLowerCase());
      if (!p || !known || !p.sizes.includes(size)) return { ok: false, errors: {}, message: CART_CHANGED };
      items.push({ productId: p.id, size, color: known, quantity, unitPriceXof: p.priceXof, previewUrl: null, printQuality: null });
    }
  }

  // Enough blank t-shirts? Counted per colour and size over the whole cart, against the stock read now.
  // (Colours not tracked in the stock always pass.) The stock itself moves when the order is marked paid.
  try {
    const stock = await readStockNow();
    const wanted = new Map<string, { color: string; size: Size; qty: number }>();
    for (const i of items) {
      const key = `${i.color.toLowerCase()}|${i.size}`;
      const w = wanted.get(key) ?? { color: i.color, size: i.size, qty: 0 };
      w.qty += i.quantity;
      wanted.set(key, w);
    }
    for (const w of wanted.values()) {
      const left = available(stock, w.color, w.size);
      if (w.qty > left)
        return {
          ok: false,
          errors: {},
          message: left > 0 ? `Il ne reste que ${left} t-shirt${left > 1 ? "s" : ""} en ${w.size} dans une des couleurs choisies. Ajuste la quantité dans ton panier.` : `Un t-shirt de ton panier est épuisé en ${w.size} dans sa couleur. Choisis une autre taille ou une autre couleur dans ton panier.`,
        };
    }
  } catch (e) {
    await logError("placeOrder: stock check", e);
    return { ok: false, errors: {}, message: "On n'a pas pu enregistrer ta commande. Réessaie dans un instant." };
  }

  const subtotalXof = items.reduce((s, i) => s + i.unitPriceXof * i.quantity, 0);
  const deliveryXof = DELIVERY[delivery].price;

  // A promo code: checked again here, on the real prices and this phone number. Refused: the order waits.
  let promo: { code: string; discount: number } | null = null;
  if (typeof input.promo === "string" && input.promo.trim()) {
    try {
      const r = await evaluatePromo(input.promo, subtotalXof, fields.phone.replace(/\s+/g, " "));
      if (!r.ok) return { ok: false, errors: {}, message: `Code promo : ${r.message}`, promoError: r.message };
      promo = { code: r.code, discount: r.discount };
    } catch (e) {
      await logError("placeOrder: promo check", e);
      return { ok: false, errors: {}, message: "On n'a pas pu vérifier ton code promo. Réessaie dans un instant." };
    }
  }
  const discountXof = promo?.discount ?? 0;

  try {
    // Signed in: the order goes on the customer's account (and in "Mes commandes").
    const customerId = await customerFor(fields.phone.replace(/\s+/g, " "));
    const data = {
      customerId,
      status: "PENDING_PAYMENT",
      paymentStatus: "UNPAID",
      customerName: fields.name,
      customerPhone: fields.phone.replace(/\s+/g, " "),
      customerEmail: fields.email || null,
      city: delivery === "RETRAIT" ? "" : fields.city,
      address: delivery === "RETRAIT" ? "" : fields.address,
      deliveryNotes: fields.notes || null,
      delivery,
      subtotalXof,
      deliveryXof,
      promoCode: promo?.code ?? null,
      discountXof,
      totalXof: subtotalXof - discountXof + deliveryXof,
      items: {
        create: items,
      },
    } satisfies Omit<Prisma.OrderUncheckedCreateInput, "reference">;

    // Two orders placed at the same moment can pick the same number: the unique index refuses the second, which retries.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const order = await db.order.create({ data: { ...data, reference: await nextReference() }, select: { id: true, reference: true } });
        await logActivity("order.placed", `Commande ${order.reference} passée par ${fields.name} (${data.totalXof.toLocaleString("fr-FR")} FCFA)`, { reference: order.reference, total: data.totalXof, items: items.length, ...(promo ? { promo: promo.code, discount: discountXof } : {}) }, customerId ? `client:${customerId}` : "invité");
        // Online payment on: GeniusPay's page to send the customer to (the order is saved whatever happens).
        if (onlinePaymentEnabled()) {
          const method = PAYMENT_METHOD_IDS.find((m) => m === input.method);
          const pay = await startOrderPayment(order.id, method);
          return { ok: true, reference: order.reference, key: orderKey(order.id), ...(pay.ok ? { payUrl: pay.url } : { payError: pay.message }) };
        }
        return { ok: true, reference: order.reference, key: orderKey(order.id) };
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
      }
    }
    throw new Error("Could not pick a free order reference after 5 attempts.");
  } catch (e) {
    await logError("placeOrder", e);
    return { ok: false, errors: {}, message: "On n'a pas pu enregistrer ta commande. Réessaie dans un instant." };
  }
}

/** "AS-2611-0143": year, month, then a number that runs through the month. */
async function nextReference() {
  const now = new Date(); // Abidjan is on UTC
  const prefix = `AS-${String(now.getUTCFullYear()).slice(2)}${String(now.getUTCMonth() + 1).padStart(2, "0")}-`;
  const last = await db.order.findFirst({ where: { reference: { startsWith: prefix } }, orderBy: { reference: "desc" }, select: { reference: true } });
  const n = last ? Number.parseInt(last.reference.slice(prefix.length), 10) || 0 : 0;
  return `${prefix}${String(n + 1).padStart(4, "0")}`;
}
