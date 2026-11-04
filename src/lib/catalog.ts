import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { PRODUCTS, productSlug, type Product, type ProductTagLabel } from "@/lib/products";

/** Cache tag of the shop's catalogue: the admin's product actions expire it. */
export const CATALOG_TAG = "catalog";

const TAG: Record<string, ProductTagLabel> = { NOUVEAU: "Nouveau", BEST_SELLER: "Best-seller", PROMO: "Promo" };
const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];

async function readCatalog(): Promise<Product[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");
  const rows = await db.product.findMany({ where: { active: true }, orderBy: { createdAt: "asc" } });
  return rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.priceXof,
    oldPrice: p.oldPriceXof ?? undefined,
    tag: p.tag ? TAG[p.tag] : undefined,
    colors: p.colors.length ? p.colors : ["#F4F2EC"],
    sizes: SIZE_ORDER.filter((s) => p.sizes.includes(s as never)),
    art: p.art ?? undefined,
    // The starting products keep their backdrop; new ones get the shop's sand.
    bg: PRODUCTS.find((s) => productSlug(s.name) === p.slug)?.bg ?? "var(--sand)",
    photo: p.mockups[0],
  }));
}

/** Active products, oldest first. If the database cannot be read, the shop shows none rather than crashing (not cached). */
export async function getCatalog(): Promise<Product[]> {
  try {
    return await readCatalog();
  } catch (e) {
    console.error("Catalogue unavailable", e);
    return [];
  }
}
