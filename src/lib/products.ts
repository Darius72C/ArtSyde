// Placeholder catalogue — replace with products from the API.
export type Art = "wordmark" | "line" | "sun" | "script" | "crest" | "plain";
export type Product = {
  id: number;
  name: string;
  price: number;
  oldPrice?: number;
  tag?: "Nouveau" | "Best-seller" | "Promo";
  colors: string[];
  art: Art;
  bg: string;
};

export const PRODUCTS: Product[] = [
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
