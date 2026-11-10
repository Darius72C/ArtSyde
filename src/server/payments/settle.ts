import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";
import { orderHref, orderKey } from "@/lib/orders";
import { CREDIT_PACKS } from "@/lib/credits";
import { STOCK_TAG } from "@/server/stock";
import { logActivity, logWarning, logError } from "@/server/log";
import { allow } from "@/server/rate-limit";
import { siteUrl } from "@/server/site";
import { paymentFee } from "@/lib/payment-fees";
import { createPayment, internationalPhone, operatorRouting, failedStatus, geniusConfig, getPayment, paidStatus, sandbox, type GeniusPayment } from "./geniuspay";

/*
 * Orders and credit purchases getting paid: by hand from the admin, or online through GeniusPay.
 * Both end in the same place (payOrder, payCreditPurchase): one transaction, a conditional switch from
 * UNPAID so a payment is counted once, the stock or the credits moved inside it.
 */

type Tx = Prisma.TransactionClient;

/** After a payment: the admin pages and the shop's stock show it on their next request. */
function refreshAfterPayment(reference?: string) {
  if (reference) revalidatePath(`/admin/commandes/${encodeURIComponent(reference)}`);
  for (const p of ["/admin/commandes", "/admin", "/admin/produits", "/admin/credits", "/admin/studio"]) revalidatePath(p);
  revalidateTag(STOCK_TAG, { expire: 0 });
}

/** Adds `sign × quantity` to each item's colour and size; lines that don't exist are listed, not created. */
export async function moveStock(tx: Tx, items: { color: string; size: string; quantity: number }[], sign: 1 | -1) {
  const warnings: string[] = [];
  for (const it of items) {
    const line = await tx.colorStock.findFirst({ where: { colorHex: { equals: it.color, mode: "insensitive" }, size: it.size as never } });
    if (!line) {
      if (sign < 0) warnings.push(`${it.color.toUpperCase()} ${it.size} : couleur ou taille absente du stock, rien n'a été déduit.`);
      continue;
    }
    if (sign < 0 && line.quantity < it.quantity) warnings.push(`${line.colorName} ${it.size} : il en restait ${line.quantity}, il en fallait ${it.quantity}. Le stock passe à ${line.quantity - it.quantity}.`);
    await tx.colorStock.update({ where: { id: line.id }, data: { quantity: { increment: sign * it.quantity } } });
  }
  return warnings;
}

export type PayResult = { ok: true; reference: string; warnings: string[] } | { ok: false; message: string };

/**
 * An order paid: PAID, its t-shirts out of the stock, once (a second call finds nothing to switch).
 * `via`: "admin" (confirmed by hand) or "geniuspay" (with its payment reference and method).
 */
export async function payOrder(orderId: string, via: { by: "admin" } | { by: "geniuspay"; ref: string; method?: string }): Promise<PayResult> {
  const r = await db.$transaction(async (tx) => {
    const o = await tx.order.findUnique({ where: { id: orderId }, select: { reference: true, items: { select: { color: true, size: true, quantity: true } } } });
    if (!o) return { ok: false as const, message: "Commande introuvable." };
    const switched = await tx.order.updateMany({
      where: { id: orderId, paymentStatus: { in: ["UNPAID", "FAILED"] }, status: "PENDING_PAYMENT" },
      data: { paymentStatus: "PAID", status: "PAID", ...(via.by === "geniuspay" ? { paymentRef: via.ref, ...(via.method ? { paymentMethod: via.method } : {}) } : {}) },
    });
    if (!switched.count) return { ok: false as const, message: "Cette commande n'est plus en attente de paiement." };
    const warnings = await moveStock(tx, o.items, -1);
    return { ok: true as const, reference: o.reference, warnings };
  });
  if (!r.ok) return r;
  await logActivity("order.paid", via.by === "admin" ? `Commande ${r.reference} marquée payée : t-shirts sortis du stock` : `Commande ${r.reference} payée en ligne (GeniusPay) : t-shirts sortis du stock`, { reference: r.reference, warnings: r.warnings, ...(via.by === "geniuspay" ? { paymentRef: via.ref } : {}) }, via.by === "admin" ? "admin" : "GeniusPay");
  refreshAfterPayment(r.reference);
  return r;
}

/**
 * A credit purchase paid: PAID, linked to a customer (found or created by phone), its credits given (a
 * CreditEntry PURCHASE whose unique paymentRef is the purchase's reference: a second lock). Once.
 */
export async function payCreditPurchase(id: string, via: { by: "admin" } | { by: "geniuspay"; ref: string }): Promise<PayResult> {
  const r = await db.$transaction(async (tx) => {
    const p = await tx.creditPurchase.findUnique({ where: { id } });
    if (!p) return { ok: false as const, message: "Achat introuvable." };
    const switched = await tx.creditPurchase.updateMany({
      where: { id, paymentStatus: { in: ["UNPAID", "FAILED"] } },
      data: { paymentStatus: "PAID", paidAt: new Date(), ...(via.by === "geniuspay" ? { paymentRef: via.ref } : {}) },
    });
    if (!switched.count) return { ok: false as const, message: "Cet achat est déjà payé." };
    let customerId = p.customerId;
    if (!customerId) {
      // Keep the e-mail only if no other customer already uses it (it is unique).
      const emailTaken = p.customerEmail ? await tx.customer.findFirst({ where: { email: p.customerEmail, NOT: { phone: p.customerPhone } }, select: { id: true } }) : null;
      const email = p.customerEmail && !emailTaken ? p.customerEmail : undefined;
      const c = await tx.customer.upsert({ where: { phone: p.customerPhone }, create: { name: p.customerName, phone: p.customerPhone, email }, update: {}, select: { id: true } });
      customerId = c.id;
      await tx.creditPurchase.update({ where: { id }, data: { customerId } });
    }
    await tx.creditEntry.create({ data: { customerId, amount: p.credits, reason: "PURCHASE", pack: p.pack, priceXof: p.priceXof, paymentRef: p.reference } });
    return { ok: true as const, reference: p.reference, warnings: [] as string[], credits: p.credits };
  });
  if (!r.ok) return r;
  await logActivity("credits.paid", via.by === "admin" ? `Achat de crédits ${r.reference} marqué payé : ${r.credits} crédits versés` : `Achat de crédits ${r.reference} payé en ligne (GeniusPay) : ${r.credits} crédits versés`, { reference: r.reference }, via.by === "admin" ? "admin" : "GeniusPay");
  refreshAfterPayment();
  return { ok: true, reference: r.reference, warnings: [] };
}

/* ---------- Online payment (GeniusPay) ---------- */

/**
 * Creates a GeniusPay payment with the operator chosen. No falling back to another one if it refuses: the fee
 * charged is that operator's, and the customer must not land on a different one. The error reaches the journal.
 */
async function open(np: Parameters<typeof createPayment>[1]): Promise<GeniusPayment> {
  const cfg = geniusConfig()!;
  const site = siteUrl();
  // GeniusPay can only reach a public address: no webhook from a local computer (the return check covers it).
  if (!/localhost|127\.0\.0\.1/.test(site)) np.webhook_url = `${site}/api/geniuspay/webhook`;
  return createPayment(cfg, np);
}

export type StartResult = { ok: true; url: string } | { ok: false; message: string };

/** Starts paying an order online: GeniusPay's page to send the customer to. */
export async function startOrderPayment(orderId: string, method?: string): Promise<StartResult> {
  const cfg = geniusConfig();
  if (!cfg) return { ok: false, message: "Le paiement en ligne n'est pas encore disponible." };
  const o = await db.order.findUnique({ where: { id: orderId }, select: { id: true, reference: true, totalXof: true, paymentMethod: true, customerName: true, customerPhone: true, customerEmail: true, status: true, paymentStatus: true } });
  if (!o || o.status !== "PENDING_PAYMENT" || o.paymentStatus === "PAID") return { ok: false, message: "Cette commande n'attend plus de paiement." };
  const back = `${siteUrl()}${orderHref(o.reference, orderKey(o.id))}`;
  // The customer pays the operator's fee on top of the order (src/lib/payment-fees.ts).
  const fee = paymentFee(o.totalXof, method ?? o.paymentMethod);
  try {
    const pay = await open({
      amount: o.totalXof + fee,
      currency: "XOF",
      description: `Commande ${o.reference} — ArtSyde`,
      customer: { name: o.customerName, phone: internationalPhone(o.customerPhone), country: "CI", ...(o.customerEmail ? { email: o.customerEmail } : {}) },
      ...operatorRouting(method ?? o.paymentMethod),
      success_url: `${back}&paiement=retour`,
      error_url: `${back}&paiement=echec`,
      metadata: { kind: "order", order: o.reference },
    });
    if (!pay.url) throw new Error("no page to pay on");
    await db.order.update({ where: { id: o.id }, data: { paymentRef: pay.reference, paymentStatus: "UNPAID", paymentFeeXof: fee, ...(method ? { paymentMethod: method } : {}) } });
    await logActivity("payment.started", `Paiement en ligne ouvert pour la commande ${o.reference} (${(o.totalXof + fee).toLocaleString("fr-FR")} FCFA, dont ${fee.toLocaleString("fr-FR")} de frais)`, { reference: o.reference, paymentRef: pay.reference, fee, sandbox: sandbox(cfg) });
    return { ok: true, url: pay.url };
  } catch (e) {
    await logError("geniuspay.create", e, { order: o.reference });
    return { ok: false, message: "Ce moyen de paiement ne répond pas. Ta commande est enregistrée : réessaie dans un instant depuis son suivi, ou choisis-en un autre." };
  }
}

/** Starts paying a credit purchase online. */
export async function startCreditPayment(purchaseId: string, method?: string): Promise<StartResult> {
  const cfg = geniusConfig();
  if (!cfg) return { ok: false, message: "Le paiement en ligne n'est pas encore disponible." };
  const p = await db.creditPurchase.findUnique({ where: { id: purchaseId } });
  if (!p || p.paymentStatus === "PAID") return { ok: false, message: "Cet achat est déjà payé." };
  const back = `${siteUrl()}/credits?achat=${encodeURIComponent(p.reference)}`;
  const fee = paymentFee(p.priceXof, method ?? p.paymentMethod);
  try {
    const pay = await open({
      amount: p.priceXof + fee,
      currency: "XOF",
      description: `Crédits studio ArtSyde : pack ${CREDIT_PACKS[p.pack].name} (${p.credits} crédits)`,
      customer: { name: p.customerName, phone: internationalPhone(p.customerPhone), country: "CI", ...(p.customerEmail ? { email: p.customerEmail } : {}) },
      ...operatorRouting(method ?? p.paymentMethod),
      success_url: `${back}&paiement=retour`,
      error_url: `${back}&paiement=echec`,
      metadata: { kind: "credits", purchase: p.reference },
    });
    if (!pay.url) throw new Error("no page to pay on");
    await db.creditPurchase.update({ where: { id: p.id }, data: { paymentRef: pay.reference, paymentStatus: "UNPAID", paymentFeeXof: fee, ...(method ? { paymentMethod: method } : {}) } });
    await logActivity("payment.started", `Paiement en ligne ouvert pour l'achat de crédits ${p.reference}`, { reference: p.reference, paymentRef: pay.reference, sandbox: sandbox(cfg) });
    return { ok: true, url: pay.url };
  } catch (e) {
    await logError("geniuspay.create", e, { purchase: p.reference });
    return { ok: false, message: "Ce moyen de paiement ne répond pas. Ton achat est enregistré : réessaie dans un instant, ou choisis-en un autre." };
  }
}

export type SettleStatus = "paid" | "pending" | "failed" | "mismatch" | "unknown";

/**
 * What GeniusPay says about a payment, applied: paid the right sum (in XOF, and not a test payment while the
 * shop sells for real) → the order or the purchase is paid; failed → marked FAILED (the customer can try again).
 * `said`: GeniusPay's word already in hand (a signed webhook), else it is asked now.
 */
export async function settle(paymentRef: string, said?: GeniusPayment): Promise<SettleStatus> {
  const cfg = geniusConfig();
  if (!cfg) return "unknown";
  const order = await db.order.findUnique({ where: { paymentRef }, select: { id: true, reference: true, totalXof: true, paymentFeeXof: true, paymentStatus: true, paymentMethod: true } });
  const purchase = order ? null : await db.creditPurchase.findUnique({ where: { paymentRef }, select: { id: true, reference: true, priceXof: true, paymentFeeXof: true, paymentStatus: true } });
  if (!order && !purchase) return "unknown"; // not ours (another site on the same account, a test)
  if ((order ?? purchase)!.paymentStatus === "PAID") return "paid";

  const pay = said ?? (await getPayment(cfg, paymentRef));
  const price = order ? order.totalXof + order.paymentFeeXof : purchase!.priceXof + purchase!.paymentFeeXof; // what GeniusPay was asked to charge
  const label = order ? `commande ${order.reference}` : `achat de crédits ${purchase!.reference}`;

  if (paidStatus(pay.status)) {
    // Paid only when everything checks out. Anything missing or unreadable is a reason to stop, never to go on:
    // an amount GeniusPay doesn't send (or sends under another name) must not mark an order paid.
    const why: string[] = [];
    if (!Number.isFinite(pay.amount) || pay.amount <= 0) why.push("montant absent ou illisible");
    else if (Math.round(pay.amount) < price) why.push(`montant insuffisant (${Math.round(pay.amount)} reçus, ${price} attendus)`);
    // The payment is created in XOF (startOrderPayment): a currency, when GeniusPay gives one, must be that.
    if (pay.currency !== "" && !["XOF", "FCFA", "CFA"].includes(pay.currency.toUpperCase())) why.push(`devise ${pay.currency}`);
    // With live keys, a payment GeniusPay calls a test one is no money.
    if (!sandbox(cfg) && ["sandbox", "test", "testing"].includes(pay.environment.toLowerCase())) why.push(`paiement de test (${pay.environment})`);
    if (why.length) {
      // Nothing given; the team checks it by hand in GeniusPay. Noted once per payment (the customer's page and
      // the webhook may ask several times).
      if (await allow(`pay-mismatch:${paymentRef}`, 1, 30 * 24 * 60 * 60 * 1000)) {
        await logWarning(
          "payment.mismatch",
          `Paiement GeniusPay à vérifier pour la ${label} : ${why.join(", ")}. Rien n'a été validé : vérifie dans GeniusPay, puis marque-le payé à la main s'il est bon.`,
          { paymentRef, amount: pay.amount, currency: pay.currency, environment: pay.environment, expected: price, reasons: why },
        );
      }
      return "mismatch";
    }
    const r = order ? await payOrder(order.id, { by: "geniuspay", ref: paymentRef, method: order.paymentMethod ?? undefined }) : await payCreditPurchase(purchase!.id, { by: "geniuspay", ref: paymentRef });
    return r.ok || r.message.includes("plus en attente") || r.message.includes("déjà payé") ? "paid" : "pending";
  }
  if (failedStatus(pay.status)) {
    if (order) await db.order.updateMany({ where: { id: order.id, paymentStatus: "UNPAID" }, data: { paymentStatus: "FAILED" } });
    else await db.creditPurchase.updateMany({ where: { id: purchase!.id, paymentStatus: "UNPAID" }, data: { paymentStatus: "FAILED" } });
    await logActivity("payment.failed", `Paiement GeniusPay ${pay.status} pour la ${label}`, { paymentRef, status: pay.status });
    refreshAfterPayment(order?.reference);
    return "failed";
  }
  return "pending";
}
