import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/server/db";
import { CATALOG_TAG } from "@/server/catalog";
import { productHref } from "@/lib/products";

/** Cache tag of the home page's hero cards: the admin's /admin/accueil actions expire it. */
export const HERO_TAG = "hero";

/** The hero has three places: 0 in front, 1 on the left, 2 on the right. */
export const HERO_SLOTS = [0, 1, 2] as const;

/** A card as the home page shows it. Without a product, it has no label and leads to the shop. */
export type HeroCardView = { slot: number; image: string; name?: string; price?: number; href: string };

async function readHeroCards(): Promise<HeroCardView[]> {
  "use cache";
  cacheTag(HERO_TAG, CATALOG_TAG); // a product's new name or price shows on its card too
  cacheLife("hours");
  const rows = await db.heroCard.findMany({ orderBy: { slot: "asc" }, include: { product: { select: { name: true, priceXof: true, slug: true, active: true } } } });
  return rows.map((r) => {
    const p = r.product?.active ? r.product : null; // a product taken off the shop no longer gets a link
    return { slot: r.slot, image: r.imageUrl, name: p?.name, price: p?.priceXof, href: p ? productHref(p) : "/#boutique" };
  });
}

/** The cards set in the admin, in slot order. None (or the database unreadable): the hero uses the newest product photos. */
export async function getHeroCards(): Promise<HeroCardView[]> {
  try {
    return await readHeroCards();
  } catch (e) {
    console.error("Hero cards unavailable", e);
    return [];
  }
}
