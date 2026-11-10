import type { PaymentMethodId } from "@/lib/credits";

/*
 * What GeniusPay keeps on a payment, per operator: the gateway's rate + GeniusPay's 1 % + 100 FCFA. From the
 * merchant dashboard (Intégrations > Gateways): Wave 1.5 %; Orange, MTN and Moov through PawaPay or Paystack
 * 3.5 %; cards through Stripe or Paystack 5 %. If the gateways or their rates change there, change them here. In basis points: 250 = 2.5 %.
 */
const FIXED_XOF = 100;
const RATE_BPS: Record<PaymentMethodId, number> = { WAVE: 250, ORANGE_MONEY: 450, MTN: 450, MOOV: 450, CARD: 600 };
const HIGHEST_BPS = Math.max(...Object.values(RATE_BPS));

/**
 * The fee the customer pays on top of `amount`, so that once GeniusPay has taken its share of the whole sum
 * the shop receives `amount`: charged = (amount + fixed) / (1 - rate), rounded up to the franc.
 * An operator not known yet: the highest rate, so the shop never comes up short.
 */
export function paymentFee(amount: number, method?: string | null): number {
  const bps = RATE_BPS[method as PaymentMethodId] ?? HIGHEST_BPS;
  return Math.ceil(((amount + FIXED_XOF) * 10_000) / (10_000 - bps)) - amount;
}
