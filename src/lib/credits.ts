import type { CreditPack } from "@/generated/prisma/client";

/*
 * Studio credit packs and how they are paid. Shared by the home section, the /credits page and
 * the `buyCredits` action (which recomputes the price from here, never from the browser).
 * Example values — set real packs and prices once the payment provider is chosen.
 */
export const CREDIT_PACKS: Record<CreditPack, { name: string; credits: number; priceXof: number; note: string; best?: boolean }> = {
  DECOUVERTE: { name: "Découverte", credits: 20, priceXof: 1000, note: "Pour tester tes premières idées." },
  CREATEUR: { name: "Créateur", credits: 60, priceXof: 2500, note: "Le meilleur rapport crédits / prix.", best: true },
  STUDIO: { name: "Studio", credits: 150, priceXof: 5000, note: "Pour créer sans compter." },
};
export const CREDIT_PACK_IDS = Object.keys(CREDIT_PACKS) as CreditPack[];

/** Ways to pay. The key is what is stored in `paymentMethod` (same values as on orders). */
export const PAYMENT_METHODS = { WAVE: "Wave", ORANGE_MONEY: "Orange Money", MTN: "MTN MoMo", MOOV: "Moov Money", CARD: "Carte bancaire" } as const;
export type PaymentMethodId = keyof typeof PAYMENT_METHODS;
// What customers can choose. Moov is out while its only route (PawaPay) answers ACCOUNT_DEACTIVATED; it keeps its label for past payments.
export const PAYMENT_METHOD_IDS = (Object.keys(PAYMENT_METHODS) as PaymentMethodId[]).filter((m) => m !== "MOOV");

export type CreditFields = { name: string; phone: string; email: string };
export type BuyCreditsInput = { pack: CreditPack; method: PaymentMethodId; fields: CreditFields };
/** `payUrl`: GeniusPay's page to pay on (online payment on). */
export type BuyCreditsResult = { ok: true; reference: string; payUrl?: string; payError?: string } | { ok: false; errors: Partial<Record<keyof CreditFields, string>>; message?: string };
