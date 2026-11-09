"use server";

import { db } from "@/server/db";
import { orderHref, orderKey } from "@/lib/orders";
import { cleanReference } from "@/server/reference";
import { clientIp, hits, record } from "@/server/rate-limit";

export type TrackResult = { ok: true; href: string } | { ok: false; message: string };

/** Failed searches allowed per visitor in an hour: plenty for typos, far too few to try references one by one. */
const MISSES = { max: 10, windowMs: 60 * 60 * 1000 };

/**
 * A phone number reduced to its national digits, so "+225 07 12 34 56 78", "00225 0712345678" and
 * "07 12 34 56 78" are the same number.
 */
function nationalDigits(v: string) {
  let d = String(v ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("225") && d.length > 10) d = d.slice(3);
  return d;
}

/**
 * "Suivi de commande": finds an order by its reference and the phone number given at checkout, and returns
 * its tracking page (with the key the checkout gave). Both must match, the whole number, so a reference alone
 * reveals nothing; and failed tries are limited, so references can't be tried one after the other.
 */
export async function findOrder(reference: string, phone: string): Promise<TrackResult> {
  const ref = cleanReference(reference, "AS");
  const tel = nationalDigits(phone);
  if (!ref) return { ok: false, message: "La référence ressemble à AS-7KP3-QX9M (dans l'e-mail ou le message de ta commande) : vérifie-la." };
  if (tel.length < 8) return { ok: false, message: "Entre le numéro donné à la commande." };

  const bucket = `track-miss:ip:${await clientIp()}`;
  if ((await hits(bucket, MISSES.windowMs)) >= MISSES.max) {
    return { ok: false, message: "Trop d'essais. Réessaie dans une heure, ou écris-nous avec ta référence." };
  }
  const o = await db.order.findUnique({ where: { reference: ref }, select: { id: true, reference: true, customerPhone: true } }).catch(() => null);
  // The same answer whether the reference or the phone is wrong.
  if (!o || nationalDigits(o.customerPhone) !== tel) {
    await record(bucket);
    return { ok: false, message: "Aucune commande avec cette référence et ce numéro." };
  }
  return { ok: true, href: orderHref(o.reference, orderKey(o.id)) };
}
