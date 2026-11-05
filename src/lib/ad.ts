/**
 * The site's ad banners (SiteSetting "ads"), set in Admin > Accueil: as many as wanted, each shown at the place
 * chosen from PLACEMENTS when it's switched on and has an image. A fixed-size horizontal strip (AdStrip).
 */
export type AdBanner = {
  /** Stable id, to edit and remove one banner. */
  id?: string;
  enabled: boolean;
  /** Where it shows (a key of PLACEMENTS). */
  placement?: Placement;
  /** The banner image (R2, ads/…), wide: 2400 × 480 px recommended (5:1), the essentials in the middle. */
  image: string;
  /** Optional words over the image's left side. */
  title?: string;
  text?: string;
  /** Optional button label ("Découvrir", "J'en profite"…), shown when there is a URL. */
  button?: string;
  /** Where the banner leads: a page of the site (/studio, /boutique/…) or another site (https://…). */
  url?: string;
  /** Text colour over the image: light for a dark image, dark for a light one. */
  tone?: "light" | "dark";
};

/** The places a banner can go, as the admin's list shows them. Each one is an <AdSlot> in the site. */
export const PLACEMENTS = {
  "home.afterHero": "Accueil — sous le haut de page",
  "home.afterNew": "Accueil — après les nouveautés",
  "home.afterWhy": "Accueil — après « Pourquoi ArtSyde »",
  "home.afterShop": "Accueil — après la boutique",
  "home.beforeFaq": "Accueil — avant les questions fréquentes",
  product: "Fiches produit — sous le produit",
  cart: "Panier — sous le panier",
  credits: "Crédits — en bas de la page",
  studio: "Studio 3D — sous le studio",
  "all.beforeFooter": "Toutes les pages — juste avant le pied de page",
} as const;
export type Placement = keyof typeof PLACEMENTS;
export const PLACEMENT_KEYS = Object.keys(PLACEMENTS) as Placement[];

export const ADS_KEY = "ads";
/** The single home banner of the first version, kept working: shown "après les nouveautés". */
export const LEGACY_AD_KEY = "ad.home";

/** Whether a banner is ready to show. */
export const adVisible = (ad: AdBanner | null | undefined): ad is AdBanner => Boolean(ad?.enabled && ad.image);

/** Another site: opened in a new tab. */
export const external = (url: string) => /^https?:\/\//i.test(url);

/** The saved list, plus the first version's single banner if it is still there (id "legacy", after the new arrivals). */
export function mergeAds(list: unknown, legacy: unknown): AdBanner[] {
  const ads = (Array.isArray(list) ? list : []).filter((a): a is AdBanner => Boolean(a && typeof a === "object"));
  const old = legacy as AdBanner | null | undefined;
  if (old?.image && !ads.some((a) => a.image === old.image)) ads.push({ ...old, id: "legacy", placement: old.placement ?? "home.afterNew" });
  return ads;
}
