import type { CreditPack, CreditReason, DeliveryMethod, OrderStatus, PaymentStatus, ProductTag, Size } from "@/generated/prisma/client";
import { TEE_COLORS } from "@/lib/data";

/** "Noir" for "#1C1C1E"; "Couleur libre" for a colour the shop does not list (as in the cart). */
export const colorName = (hex: string) => TEE_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name ?? "Couleur libre";

/**
 * French labels for the admin, safe to import from server and client code
 * (type-only imports from the generated Prisma client).
 */

/** Dot colour for a status: a theme token, never a literal. */
export type Tone = "new" | "accent" | "ink" | "ok" | "danger" | "muted";
export const TONE_DOT: Record<Tone, string> = {
  new: "bg-new",
  accent: "bg-accent",
  ink: "bg-ink",
  ok: "bg-ok",
  danger: "bg-danger",
  muted: "bg-muted",
};

/** Order statuses in the order an order goes through them. `slug` is the value in the URL (?statut=). */
export const ORDER_STATUS: Record<OrderStatus, { label: string; slug: string; tone: Tone }> = {
  PENDING_PAYMENT: { label: "En attente de paiement", slug: "a-payer", tone: "new" },
  PAID: { label: "Payée, à traiter", slug: "a-traiter", tone: "accent" },
  IN_DESIGN: { label: "En conception", slug: "conception", tone: "accent" },
  IN_PRODUCTION: { label: "En impression", slug: "impression", tone: "accent" },
  SHIPPED: { label: "En livraison", slug: "livraison", tone: "ink" },
  DELIVERED: { label: "Livrée", slug: "livree", tone: "ok" },
  CANCELLED: { label: "Annulée", slug: "annulee", tone: "muted" },
};
export const ORDER_FLOW: OrderStatus[] = ["PENDING_PAYMENT", "PAID", "IN_DESIGN", "IN_PRODUCTION", "SHIPPED", "DELIVERED", "CANCELLED"];
/** Statuses where the workshop has something to do. */
export const TO_HANDLE: OrderStatus[] = ["PAID", "IN_DESIGN", "IN_PRODUCTION"];

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: Tone }> = {
  UNPAID: { label: "Non payée", tone: "muted" },
  PAID: { label: "Payée", tone: "ok" },
  FAILED: { label: "Échec du paiement", tone: "danger" },
  REFUNDED: { label: "Remboursée", tone: "muted" },
};

const METHODS: Record<string, string> = {
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
  MTN: "MTN MoMo",
  MOOV: "Moov Money",
  CARD: "Carte bancaire",
};
export const paymentMethod = (m: string | null) => (m ? (METHODS[m] ?? m) : "—");

// Same wording as DELIVERY in src/lib/orders.ts (a client module, so it cannot be read from the server).
export const DELIVERY_METHOD: Record<DeliveryMethod, { label: string; note: string }> = {
  STANDARD: { label: "Livraison standard", note: "3 à 5 jours ouvrés" },
  EXPRESS: { label: "Livraison express", note: "24 à 48 h" },
  RETRAIT: { label: "Retrait à l'atelier", note: "Gratuit, dès que c'est prêt" },
};

export const SIZE_ORDER: Size[] = ["XS", "S", "M", "L", "XL", "XXL"];

export const PRODUCT_TAG: Record<ProductTag, string> = { NOUVEAU: "Nouveau", BEST_SELLER: "Best-seller", PROMO: "Promo" };

// Same packs as src/components/home/Credits.tsx.
export const CREDIT_PACK: Record<CreditPack, { label: string; credits: number }> = {
  DECOUVERTE: { label: "Découverte", credits: 20 },
  CREATEUR: { label: "Créateur", credits: 60 },
  STUDIO: { label: "Studio", credits: 150 },
};

export const CREDIT_REASON: Record<CreditReason, string> = {
  SIGNUP_BONUS: "Offerts à l'inscription",
  PURCHASE: "Achat de pack",
  IMAGE_UPLOAD: "Import d'image",
  DESIGN_SAVE: "Sauvegarde de design",
  HD_PREVIEW: "Aperçu HD",
  REFUND: "Crédits rendus",
  ADJUSTMENT: "Ajustement",
};

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Africa/Abidjan" });
const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Abidjan" });
const longFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Abidjan" });
/** "4 nov." */
export const shortDate = (d: Date) => dateFmt.format(d);
/** "4 nov., 14:32" */
export const dateTime = (d: Date) => dateTimeFmt.format(d);
/** "mercredi 4 novembre 2026 à 14:32" */
export const longDate = (d: Date) => longFmt.format(d);

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("fr-FR")} ${n > 1 ? many : one}`;
