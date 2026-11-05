import "server-only";
import { ADS_KEY, LEGACY_AD_KEY, mergeAds, type AdBanner } from "@/lib/ad";
import { getSetting } from "@/server/settings";

/** Every banner set in the admin (cached; saving one expires it). The first version's single banner included. */
export async function getAds(): Promise<AdBanner[]> {
  const [list, legacy] = await Promise.all([getSetting<AdBanner[]>(ADS_KEY), getSetting<AdBanner>(LEGACY_AD_KEY)]);
  return mergeAds(list, legacy);
}
