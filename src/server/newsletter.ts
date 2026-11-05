"use server";

import { randomBytes } from "node:crypto";
import { db } from "@/server/db";
import { logActivity, logError } from "@/server/log";

/* The newsletter: signing up from the home page's form, and leaving from the link in each e-mail. */

export type NewsletterResult = { ok: true } | { ok: false; message: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const newToken = () => randomBytes(24).toString("base64url");

/** Signs an address up (or back up, after leaving). Says nothing about whether it was already there. */
export async function subscribeNewsletter(input: string): Promise<NewsletterResult> {
  const email = String(input ?? "").trim().toLowerCase().slice(0, 200);
  if (!EMAIL.test(email)) return { ok: false, message: "Adresse e-mail invalide." };
  try {
    const before = await db.subscriber.findUnique({ where: { email }, select: { unsubscribedAt: true } });
    if (before && !before.unsubscribedAt) return { ok: true };
    await db.subscriber.upsert({ where: { email }, create: { email, token: newToken() }, update: { unsubscribedAt: null } });
    await logActivity("newsletter.subscribed", `Nouvel inscrit à la newsletter : ${email}`, { email });
    return { ok: true };
  } catch (e) {
    await logError("newsletter.subscribe", e);
    return { ok: false, message: "Inscription impossible pour l'instant. Réessaie dans un instant." };
  }
}

/** Leaves the newsletter with the secret token of the e-mail's link. */
export async function unsubscribeNewsletter(token: string): Promise<NewsletterResult> {
  const t = String(token ?? "").slice(0, 100);
  if (!t) return { ok: false, message: "Lien incomplet." };
  const sub = await db.subscriber.findUnique({ where: { token: t } }).catch(() => null);
  if (!sub) return { ok: false, message: "Ce lien n'est plus valable." };
  if (!sub.unsubscribedAt) {
    await db.subscriber.update({ where: { id: sub.id }, data: { unsubscribedAt: new Date() } });
    await logActivity("newsletter.unsubscribed", `Désabonnement de la newsletter : ${sub.email}`, { email: sub.email });
  }
  return { ok: true };
}
