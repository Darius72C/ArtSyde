/**
 * The steps of a visit counted for the admin (Vue d'ensemble > Parcours des visiteurs): totals per day only,
 * nothing about who. `track` fires and forgets; it never slows or breaks the page.
 */
export const METRICS = {
  "product.view": "Pages produit vues",
  "worn.open": "Vue Porté ouverte",
  "size.advice": "Conseil de taille appliqué",
  "worn.share": "Visuels Porté partagés",
  "whatsapp.question": "Questions WhatsApp depuis un produit",
  "cart.add": "Ajouts au panier (boutique)",
  "studio.open": "Studio ouvert",
  "studio.download": "Visuels téléchargés (studio)",
  "studio.cart": "Créations ajoutées au panier",
  "checkout.open": "Paiement commencé",
} as const;
export type Metric = keyof typeof METRICS;

export function track(name: Metric) {
  void import("@/server/metrics").then((m) => m.trackEvent(name)).catch(() => {});
}
