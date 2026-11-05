import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/server/db";

/** Cache tag of the home page's hero cards: the admin's /admin/accueil actions expire it. */
export const HERO_TAG = "hero";

/** The hero has three places: 0 in front, 1 on the left, 2 on the right. */
export const HERO_SLOTS = [0, 1, 2] as const;

/** A card as the home page shows it: an ad visual, just an image. */
export type HeroCardView = { slot: number; image: string };

async function readHeroCards(): Promise<HeroCardView[]> {
  "use cache";
  cacheTag(HERO_TAG);
  cacheLife("hours");
  const rows = await db.heroCard.findMany({ orderBy: { slot: "asc" }, select: { slot: true, imageUrl: true } });
  return rows.map((r) => ({ slot: r.slot, image: r.imageUrl }));
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
