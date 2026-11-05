import "server-only";
import { getCatalog } from "@/server/catalog";
import { getHeroCards } from "@/server/hero";

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
