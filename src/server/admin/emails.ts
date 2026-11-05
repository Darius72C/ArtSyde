"use server";

import { updateTag } from "next/cache";
import { db } from "@/server/db";
import { sendEmail } from "@/server/email/send";
import { welcomeEmail, welcomeTexts } from "@/server/email/welcome";
import { emailAd, emailImage } from "@/server/email/image";
import { SIGNUP_CREDITS } from "@/server/auth";
import { settingTag } from "@/server/settings";
import { logActivity } from "@/server/log";
import { WELCOME_FIELDS, WELCOME_KEY, mergeWelcome, type WelcomeTexts } from "@/lib/email-texts";
import { requireAdmin } from "./auth";

export type TestEmailResult = { ok: boolean; message: string };

const SAMPLE = { name: "Awa Koné", email: "awa@exemple.com" };

/** Only the known fields, trimmed to their length. */
function clean(input: Partial<WelcomeTexts>): Partial<WelcomeTexts> {
  const out: Partial<WelcomeTexts> = {};
  for (const f of WELCOME_FIELDS) {
    const v = input?.[f.key];
    if (typeof v === "string") out[f.key] = v.slice(0, f.max);
  }
  return out;
}

/** The welcome e-mail with these words (not saved): for the editor's live preview. */
export async function previewWelcome(input: Partial<WelcomeTexts>): Promise<{ subject: string; html: string }> {
  await requireAdmin();
  const e = welcomeEmail({ ...SAMPLE, credits: SIGNUP_CREDITS, image: await emailImage(), texts: mergeWelcome(clean(input)), ad: await emailAd() });
  return { subject: e.subject, html: e.html };
}

/** Saves the welcome e-mail's words: the next accounts get them. */
export async function saveWelcomeTexts(input: Partial<WelcomeTexts>): Promise<TestEmailResult> {
  await requireAdmin();
  const value = clean(input);
  if (value.image && !/^https:\/\//i.test(value.image)) return { ok: false, message: "Photo refusée : envoie-la depuis ce formulaire." };
  await db.siteSetting.upsert({ where: { key: WELCOME_KEY }, create: { key: WELCOME_KEY, value }, update: { value } });
  updateTag(settingTag(WELCOME_KEY));
  await logActivity("email.template_saved", "Textes de l'e-mail de bienvenue modifiés", undefined, "admin");
  return { ok: true, message: "Enregistré : les prochains comptes recevront ce texte." };
}

/** Back to the default words. */
export async function resetWelcomeTexts(): Promise<TestEmailResult> {
  await requireAdmin();
  await db.siteSetting.deleteMany({ where: { key: WELCOME_KEY } });
  updateTag(settingTag(WELCOME_KEY));
  await logActivity("email.template_reset", "Textes de l'e-mail de bienvenue remis par défaut", undefined, "admin");
  return { ok: true, message: "Textes par défaut remis." };
}

/** Sends the welcome e-mail (with the saved words) to an address the admin types, to see it in a real inbox. */
export async function sendTestWelcome(to: string): Promise<TestEmailResult> {
  await requireAdmin();
  const email = String(to ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "Adresse e-mail invalide." };
  const r = await sendEmail(welcomeEmail({ name: SAMPLE.name, email, credits: SIGNUP_CREDITS, image: await emailImage(), texts: await welcomeTexts(), ad: await emailAd() }));
  if (r.ok) return { ok: true, message: `E-mail de test envoyé à ${email}.` };
  if ("skipped" in r && r.skipped) return { ok: false, message: "Brevo n'est pas encore configuré : ajoute BREVO_API_KEY et EMAIL_FROM dans .env, puis relance le site." };
  return { ok: false, message: `Brevo a refusé l'envoi${r.error ? ` (${r.error})` : ""}. Vérifie la clé et l'adresse d'expéditeur.` };
}
