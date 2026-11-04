import "server-only";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { orderKey, type PublicOrder } from "@/lib/orders";
import { PRODUCTS, productSlug, type Art } from "@/lib/products";

/**
 * The order behind a link from the checkout, or null. Both the reference and the key must match
 * (see `orderKey`). Read at request time: the workshop moves the status along from the admin.
 */
export async function getPublicOrder(reference: string, key: string | undefined): Promise<PublicOrder | null> {
  await connection();
  if (!key) return null;
  const o = await db.order.findUnique({
    where: { reference },
    include: { items: { orderBy: { id: "asc" }, include: { product: { select: { id: true, name: true, slug: true, art: true, mockups: true } } } } },
  });
  if (!o || orderKey(o.id) !== key) return null;

  return {
    reference: o.reference,
    status: o.status,
    delivery: o.delivery,
    firstName: o.customerName.split(" ")[0],
    phone: o.customerPhone,
    city: o.city,
    address: o.address,
    items: o.items.map((it) => {
      // The starting products keep their backdrop, as in the shop (src/lib/catalog.ts).
      const shop = it.product ? PRODUCTS.find((p) => productSlug(p.name) === it.product!.slug) : undefined;
      return {
        key: it.id,
        productId: it.product?.id ?? null,
        name: it.product?.name ?? "T-shirt personnalisé",
        price: it.unitPriceXof,
        color: it.color,
        size: it.size,
        qty: it.quantity,
        art: (it.product?.art ?? undefined) as Art | undefined,
        bg: shop?.bg ?? (it.product ? undefined : "#e7e0d3"),
        photo: it.product?.mockups[0],
        preview: it.previewUrl ?? undefined,
      };
    }),
    subtotal: o.subtotalXof,
    shipping: o.deliveryXof,
    total: o.totalXof,
  };
}
