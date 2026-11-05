import "server-only";
import { getCatalog } from "@/server/catalog";
import type { Product } from "@/lib/products";
import { getHeroCards } from "@/server/hero";
import { getAds } from "@/server/ads";
import { adInEmail, type AdBanner } from "@/lib/ad";

const isPublic = (url: string | undefined) => Boolean(url && /^https:\/\//.test(url));

/**
 * The photo at the top of e-mails: the first home page card (Admin > Accueil), else the newest product
 * photo on R2. Only public https images: an inbox can't load anything else. None: the e-mail has no photo.
 */
export async function emailImage(): Promise<string | undefined> {
  const cards = await getHeroCards().catch(() => []);
  const card = cards.find((c) => isPublic(c.image));
  if (card) return card.image;
  const products = await getCatalog().catch(() => []);
  return [...products].reverse().find((p) => isPublic(p.photo))?.photo;
}

/** The banner set to show in e-mails (Admin > Accueil > Bannières, "Afficher aussi dans les e-mails"): the first one, or none. */
export async function emailAd(): Promise<AdBanner | undefined> {
  const ads = await getAds().catch(() => []);
  return ads.find((a) => adInEmail(a) && isPublic(a.image));
}

/** The latest t-shirts with a photo an inbox can load, newest first (the newsletter's grid). */
export async function latestProducts(): Promise<Product[]> {
  const products = await getCatalog().catch(() => []);
  return [...products].reverse().filter((p) => isPublic(p.photo));
}
