import { adVisible, type Placement } from "@/lib/ad";
import { getAds } from "@/server/ads";
import { AdStrip } from "./home/AdStrip";

/**
 * A place in the site where banners can go (Admin > Accueil > Bannières, "Où l'afficher"). Renders the
 * switched-on banners set for it, one under the other, or nothing at all.
 */
export async function AdSlot({ placement }: { placement: Placement }) {
  const ads = (await getAds()).filter((a) => a.placement === placement && adVisible(a));
  if (!ads.length) return null;
  return (
    <>
      {ads.map((ad) => (
        <AdStrip key={ad.id ?? ad.image} ad={ad} />
      ))}
    </>
  );
}
