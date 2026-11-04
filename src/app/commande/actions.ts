"use server";

import { db } from "@/lib/db";
import { Prisma, Size } from "@/generated/prisma/client";
import { DELIVERY, DELIVERY_METHODS, checkFields, orderKey, type CheckoutInput, type PlaceOrderResult } from "@/lib/orders";
import { PRODUCTS, STUDIO_PRICE, productSlug } from "@/lib/products";
import { PRINT_QUALITIES, type PrintQuality } from "@/lib/studio";

/*
 * Places an order from the checkout. Anyone can POST here, so nothing from the browser is
 * trusted beyond "which t-shirt, which colour, which size, how many": prices and totals are
 * recomputed from PRODUCTS. The order waits for payment (PENDING_PAYMENT / UNPAID).
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

  // Recompute every line from the catalogue.
  const items: { slug: string | null; size: Size; color: string; quantity: number; unitPriceXof: number; previewUrl: string | null; printQuality: PrintQuality | null }[] = [];
  for (const l of lines) {
    const size = Object.values(Size).find((s) => s === l?.size);
    const quantity = Number(l?.qty);
    const color = typeof l?.color === "string" ? l.color : "";
    if (!size || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY) return { ok: false, errors: {}, message: CART_CHANGED };

    if (l.productId === null) {
      // Studio piece: front only, or front and back. The design itself is not sent yet.
      const price = Number(l.price);
      if (!HEX.test(color) || !STUDIO_PRICES.includes(price)) return { ok: false, errors: {}, message: CART_CHANGED };
      const preview = typeof l.preview === "string" && l.preview.startsWith("data:image/") && l.preview.length <= MAX_PREVIEW ? l.preview : null;
      const printQuality = PRINT_QUALITIES.find((q) => q === l.quality) ?? "STANDARD";
      items.push({ slug: null, size, color, quantity, unitPriceXof: price, previewUrl: preview, printQuality });
    } else {
      const p = PRODUCTS.find((x) => x.id === l.productId);
      const known = p?.colors.find((c) => c.toLowerCase() === color.toLowerCase());
      if (!p || !known) return { ok: false, errors: {}, message: CART_CHANGED };
      items.push({ slug: productSlug(p.name), size, color: known, quantity, unitPriceXof: p.price, previewUrl: null, printQuality: null });
    }
  }

  const subtotalXof = items.reduce((s, i) => s + i.unitPriceXof * i.quantity, 0);
  const deliveryXof = DELIVERY[delivery].price;

  try {
    // Link catalogue lines to their Product row (by slug). A product missing from the database stays unlinked.
    const slugs = [...new Set(items.flatMap((i) => (i.slug ? [i.slug] : [])))];
    const rows = slugs.length ? await db.product.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } }) : [];
    const productIds = new Map(rows.map((r) => [r.slug, r.id]));

    const data = {
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
      totalXof: subtotalXof + deliveryXof,
      items: {
        create: items.map(({ slug, ...i }) => ({ ...i, productId: slug ? (productIds.get(slug) ?? null) : null })),
      },
    } satisfies Omit<Prisma.OrderUncheckedCreateInput, "reference">;

    // Two orders placed at the same moment can pick the same number: the unique index refuses the second, which retries.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const order = await db.order.create({ data: { ...data, reference: await nextReference() }, select: { id: true, reference: true } });
        return { ok: true, reference: order.reference, key: orderKey(order.id) };
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
      }
    }
    throw new Error("Could not pick a free order reference after 5 attempts.");
  } catch (e) {
    console.error("placeOrder failed", e);
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
