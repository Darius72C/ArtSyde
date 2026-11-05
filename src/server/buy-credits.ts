"use server";

import { db } from "@/server/db";
import { customerFor } from "@/server/account";
import { Prisma } from "@/generated/prisma/client";
import { checkFields } from "@/lib/orders";
import { CREDIT_PACKS, CREDIT_PACK_IDS, PAYMENT_METHOD_IDS, type BuyCreditsInput, type BuyCreditsResult } from "@/lib/credits";
import { logActivity, logError } from "@/server/log";
import { onlinePaymentEnabled } from "@/server/payments/geniuspay";
import { startCreditPayment } from "@/server/payments/settle";

/*
 * Records a credit pack purchase from /credits. Like an order, it waits for payment
 * (paymentStatus UNPAID): the credits are only given — a CreditEntry PURCHASE — once the
 * payment is confirmed in the admin. The price comes from CREDIT_PACKS, never from the browser.
 */

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function buyCredits(input: BuyCreditsInput): Promise<BuyCreditsResult> {
  const pack = CREDIT_PACK_IDS.find((p) => p === input?.pack);
  if (!pack) return { ok: false, errors: {}, message: "Choisis un pack." };
  const method = PAYMENT_METHOD_IDS.find((m) => m === input?.method);
  if (!method) return { ok: false, errors: {}, message: "Choisis un moyen de paiement." };

  const f = input?.fields ?? {};
  const fields = { name: str(f.name, 120), phone: str(f.phone, 30), email: str(f.email, 160) };
  // The checkout's own rules for name, phone and e-mail ("RETRAIT": no address to check).
  const errors = checkFields({ ...fields, city: "", address: "", notes: "" }, "RETRAIT");
  if (Object.keys(errors).length) return { ok: false, errors };

  const { credits, priceXof } = CREDIT_PACKS[pack];
  const phone = fields.phone.replace(/\s+/g, " ");

  try {
    // The signed-in customer, or a customer already known by this number, gets the purchase on their account.
    const customerId = await customerFor(phone);
    const data = {
      pack,
      credits,
      priceXof,
      paymentMethod: method,
      customerId,
      customerName: fields.name,
      customerPhone: phone,
      customerEmail: fields.email || null,
    } satisfies Omit<Prisma.CreditPurchaseUncheckedCreateInput, "reference">;

    // Two purchases at the same moment can pick the same number: the unique index refuses the second, which retries.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const row = await db.creditPurchase.create({ data: { ...data, reference: await nextReference() }, select: { reference: true } });
        await logActivity("credits.requested", `Achat de crédits ${row.reference} : pack ${pack} (${credits} crédits, ${priceXof.toLocaleString("fr-FR")} FCFA) par ${fields.name}`, { reference: row.reference, pack, credits, price: priceXof }, customerId ? `client:${customerId}` : "invité");
        // Online payment on: GeniusPay's page to pay on (the purchase is saved whatever happens).
        if (onlinePaymentEnabled()) {
          const id = (await db.creditPurchase.findUnique({ where: { reference: row.reference }, select: { id: true } }))!.id;
          const pay = await startCreditPayment(id, method);
          return { ok: true, reference: row.reference, ...(pay.ok ? { payUrl: pay.url } : { payError: pay.message }) };
        }
        return { ok: true, reference: row.reference };
      } catch (e) {
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
      }
    }
    throw new Error("Could not pick a free credit purchase reference after 5 attempts.");
  } catch (e) {
    await logError("buyCredits", e);
    return { ok: false, errors: {}, message: "On n'a pas pu enregistrer ta demande. Réessaie dans un instant." };
  }
}

/** "CR-2611-0007": year, month, then a number that runs through the month (like orders' "AS-…"). */
async function nextReference() {
  const now = new Date(); // Abidjan is on UTC
  const prefix = `CR-${String(now.getUTCFullYear()).slice(2)}${String(now.getUTCMonth() + 1).padStart(2, "0")}-`;
  const last = await db.creditPurchase.findFirst({ where: { reference: { startsWith: prefix } }, orderBy: { reference: "desc" }, select: { reference: true } });
  const n = last ? Number.parseInt(last.reference.slice(prefix.length), 10) || 0 : 0;
  return `${prefix}${String(n + 1).padStart(4, "0")}`;
}
