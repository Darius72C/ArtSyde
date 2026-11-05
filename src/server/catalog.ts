import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/server/db";
import { getStock } from "@/server/stock";
import { PRODUCTS, parsePrint3D, productSlug, type Product, type ProductTagLabel } from "@/lib/products";

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
    photos: p.mockups,
    flats: p.flatMockups,
    print3d: parsePrint3D(p.print3d),
    description: p.description,
  }));
}

/** One active product by its slug (its page, /boutique/[slug]), from the same cached catalogue. */
export async function getProduct(slug: string): Promise<Product | undefined> {
  return (await getCatalog()).find((p) => p.slug === slug);
}

/**
 * Active products, oldest first, each with the stock of its colours (cached apart: the stock changes with
 * every paid order). If the database cannot be read, the shop shows none rather than crashing (not cached).
 */
export async function getCatalog(): Promise<Product[]> {
  try {
    const [products, stock] = await Promise.all([readCatalog(), getStock()]);
    return products.map((p) => {
      const own = Object.fromEntries(p.colors.map((c) => c.toLowerCase()).filter((c) => stock[c]).map((c) => [c, stock[c]]));
      return { ...p, stock: own };
    });
  } catch (e) {
    console.error("Catalogue unavailable", e);
    return [];
  }
}
