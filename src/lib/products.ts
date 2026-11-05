export type Art = "wordmark" | "line" | "sun" | "script" | "crest" | "plain";
export type ProductTagLabel = "Nouveau" | "Best-seller" | "Promo";

/** A t-shirt as the shop shows it, read from the Product table (src/server/catalog.ts). */
export type Product = {
  id: string; // Product.id in the database
  slug: string;
  name: string;
  price: number;
  oldPrice?: number;
  tag?: ProductTagLabel;
  colors: string[];
  sizes: string[];
  art?: Art | string; // built-in illustration, shown when there is no photo
  bg: string;
  photo?: string; // first photo uploaded from the admin
  photos: string[]; // every photo, in the admin's order (the product page shows them all)
  flats: string[]; // flat mockups (the "Mockup" tab), in the admin's order
  print3d: Print3D; // the print on the 3D t-shirt (the "3D" tab)
  description: string;
};

/** One side's print on the 3D t-shirt: centre (x, y) and width (w), in fractions of the print area, like the studio. */
export type PrintPlacement = { url: string; x: number; y: number; w: number };
export type Print3D = { front?: PrintPlacement; back?: PrintPlacement };
export const PRINT_SIDES = ["front", "back"] as const;
export type PrintSide = (typeof PRINT_SIDES)[number];
/** Where a new print lands: chest height on the front, upper back on the back (as in the studio). */
export const DEFAULT_PLACEMENT: Record<PrintSide, Omit<PrintPlacement, "url">> = { front: { x: 0.5, y: 0.36, w: 0.34 }, back: { x: 0.5, y: 0.36, w: 0.4 } };

const clamp = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);

/** Reads Product.print3d (JSON) safely: anything malformed is dropped. */
export function parsePrint3D(json: unknown): Print3D {
  const out: Print3D = {};
  if (!json || typeof json !== "object") return out;
  for (const side of PRINT_SIDES) {
    const s = (json as Record<string, unknown>)[side] as Record<string, unknown> | undefined;
    if (!s || typeof s.url !== "string" || !/^https?:\/\//.test(s.url)) continue;
    const d = DEFAULT_PLACEMENT[side];
    out[side] = { url: s.url, x: clamp(s.x, 0, 1, d.x), y: clamp(s.y, 0, 1, d.y), w: clamp(s.w, 0.05, 1, d.w) };
  }
  return out;
}

/** A product's own page. */
export const productHref = (p: Pick<Product, "slug">) => `/boutique/${p.slug}`;

/**
 * The starting catalogue. The shop no longer reads it: prisma/seed.ts writes it into the
 * Product table, and src/server/catalog.ts still takes each one's backdrop colour from here.
 */
export type SeedProduct = { id: number; name: string; price: number; oldPrice?: number; tag?: ProductTagLabel; colors: string[]; art: Art; bg: string };
export const PRODUCTS: SeedProduct[] = [
  { id: 1, name: "L'Essentiel", price: 8000, tag: "Best-seller", colors: ["#F4F2EC", "#1C1C1E", "#D8C7A5"], art: "wordmark", bg: "var(--sand)" },
  { id: 2, name: "Horizon", price: 8500, tag: "Nouveau", colors: ["#1F2A44", "#F4F2EC"], art: "line", bg: "var(--surface)" },
  { id: 3, name: "Soleil", price: 8500, oldPrice: 10000, tag: "Promo", colors: ["#D8C7A5", "#F4F2EC"], art: "sun", bg: "var(--sand)" },
  { id: 4, name: "Signature", price: 9000, tag: "Nouveau", colors: ["#1C1C1E", "#6B6B47"], art: "script", bg: "var(--sand-deep)" },
  { id: 5, name: "Atelier", price: 9000, tag: "Best-seller", colors: ["#9EA0A3", "#1C1C1E"], art: "crest", bg: "var(--sand)" },
  { id: 6, name: "Uni", price: 6500, colors: ["#F4F2EC", "#1C1C1E", "#1F2A44", "#6B6B47"], art: "plain", bg: "var(--surface)" },
  { id: 7, name: "Ligne Nuit", price: 8500, oldPrice: 9500, tag: "Promo", colors: ["#1F2A44", "#1C1C1E"], art: "line", bg: "var(--sand-deep)" },
  { id: 8, name: "Sable", price: 8000, tag: "Nouveau", colors: ["#D8C7A5", "#E9A7B8"], art: "wordmark", bg: "var(--sand)" },
];

/** A t-shirt made in the studio: front print, plus the back if there is one. */
export const STUDIO_PRICE = { base: 8000, back: 2000 } as const;

/** The product's slug in the database ("L'Essentiel" → "l-essentiel"), as prisma/seed.ts writes it. */
export const productSlug = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const formatFCFA = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;
