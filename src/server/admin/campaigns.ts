"use server";

import { after } from "next/server";
import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/server/db";
import { emailConfigured, sendEmail } from "@/server/email/send";
import { campaignEmail } from "@/server/email/campaign";
import { emailAd, emailImage, latestProducts } from "@/server/email/image";
import { siteUrl } from "@/server/site";
import { settingTag } from "@/server/settings";
import { logActivity, logError } from "@/server/log";
import { CAMPAIGNS, campaignKey, cleanCampaign, isCampaignKind, mergeCampaign, type CampaignKind, type CampaignTexts } from "@/lib/campaigns";
import { requireAdmin } from "./auth";

/* Admin > E-mails: the newsletter, promotion and announcement templates — preview, draft, test, sending. */

export type CampaignResult = { ok: boolean; message: string };

const SAMPLE = { name: "Awa Koné", email: "awa@exemple.com" };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** How many e-mails go out at the same time while sending to the whole list. */
const BATCH = 5;

/** The words as typed, checked: only the template's fields, an https image, a site page or https link. */
function check(kind: CampaignKind, input: Partial<CampaignTexts>): { texts: CampaignTexts; error?: string } {
  const texts = mergeCampaign(kind, cleanCampaign(kind, input));
  if (texts.image && !/^https:\/\//i.test(texts.image)) return { texts, error: "Photo refusée : envoie-la depuis ce formulaire." };
  if (texts.url && !/^(\/(?!\/)|https?:\/\/)/i.test(texts.url)) return { texts, error: "Lien du bouton : une page du site (/studio…) ou une adresse complète (https://…)." };
  return { texts };
}

/** What every campaign e-mail needs besides its words: the fallback photo, the latest t-shirts, the banner. */
async function extras() {
  const [image, products, ad] = await Promise.all([emailImage(), latestProducts(), emailAd()]);
  return { image, products, ad };
}

/** The e-mail with these words (not saved), for the editor's live preview. */
export async function previewCampaign(kind: CampaignKind, input: Partial<CampaignTexts>): Promise<{ subject: string; html: string }> {
  await requireAdmin();
  if (!isCampaignKind(kind)) throw new Error("Unknown template");
  const e = campaignEmail(kind, check(kind, input).texts, { ...SAMPLE, ...(await extras()) });
  return { subject: e.subject, html: e.html };
}

/** Saves the words as this template's draft. */
export async function saveCampaign(kind: CampaignKind, input: Partial<CampaignTexts>): Promise<CampaignResult> {
  await requireAdmin();
  if (!isCampaignKind(kind)) return { ok: false, message: "Modèle inconnu." };
  const { error } = check(kind, input);
  if (error) return { ok: false, message: error };
  const value = cleanCampaign(kind, input);
  await db.siteSetting.upsert({ where: { key: campaignKey(kind) }, create: { key: campaignKey(kind), value }, update: { value } });
  updateTag(settingTag(campaignKey(kind)));
  return { ok: true, message: "Brouillon enregistré." };
}

/** Back to the template's original words. */
export async function resetCampaign(kind: CampaignKind): Promise<CampaignResult> {
  await requireAdmin();
  if (!isCampaignKind(kind)) return { ok: false, message: "Modèle inconnu." };
  await db.siteSetting.deleteMany({ where: { key: campaignKey(kind) } });
  updateTag(settingTag(campaignKey(kind)));
  return { ok: true, message: "Modèle d'origine remis." };
}

/** Sends the e-mail as it is in the editor (saved or not) to an address the admin types. */
export async function sendTestCampaign(kind: CampaignKind, input: Partial<CampaignTexts>, to: string): Promise<CampaignResult> {
  await requireAdmin();
  if (!isCampaignKind(kind)) return { ok: false, message: "Modèle inconnu." };
  const email = String(to ?? "").trim();
  if (!EMAIL.test(email)) return { ok: false, message: "Adresse e-mail invalide." };
  const { texts, error } = check(kind, input);
  if (error) return { ok: false, message: error };
  const e = campaignEmail(kind, texts, { name: SAMPLE.name, email, ...(await extras()) });
  const r = await sendEmail({ ...e, subject: `[Test] ${e.subject}`, tags: [kind, "test"] });
  if (r.ok) return { ok: true, message: `E-mail de test envoyé à ${email}.` };
  if ("skipped" in r && r.skipped) return { ok: false, message: "Brevo n'est pas encore configuré : ajoute BREVO_API_KEY et EMAIL_FROM dans .env, puis relance le site." };
  return { ok: false, message: `Brevo a refusé l'envoi${r.error ? ` (${r.error})` : ""}. Vérifie la clé et l'adresse d'expéditeur.` };
}

/**
 * Saves the words, then sends the e-mail to every subscriber still on the list, each with their own
 * "Se désabonner" link. The sending goes on after the answer (a few at a time); the journal shows each e-mail
 * and a summary at the end.
 */
export async function sendCampaign(kind: CampaignKind, input: Partial<CampaignTexts>): Promise<CampaignResult> {
  await requireAdmin();
  if (!isCampaignKind(kind)) return { ok: false, message: "Modèle inconnu." };
  if (!emailConfigured()) return { ok: false, message: "Brevo n'est pas encore configuré : rien ne peut partir." };
  const { texts, error } = check(kind, input);
  if (error) return { ok: false, message: error };
  const saved = await saveCampaign(kind, input);
  if (!saved.ok) return saved;

  const subscribers = await db.subscriber.findMany({ where: { unsubscribedAt: null }, select: { email: true, name: true, token: true }, orderBy: { createdAt: "asc" } });
  if (!subscribers.length) return { ok: false, message: "Personne n'est encore inscrit à la newsletter." };
  const label = CAMPAIGNS[kind].label;
  await logActivity("campaign.started", `${label} « ${texts.subject} » : envoi lancé à ${subscribers.length} inscrit${subscribers.length > 1 ? "s" : ""}`, { kind, count: subscribers.length }, "admin");

  const site = siteUrl();
  after(async () => {
    try {
      const more = await extras();
      let sent = 0;
      let failed = 0;
      for (let i = 0; i < subscribers.length; i += BATCH) {
        const results = await Promise.all(
          subscribers.slice(i, i + BATCH).map((s) => sendEmail(campaignEmail(kind, texts, { name: s.name, email: s.email, ...more, unsubscribe: `${site}/desabonnement?t=${encodeURIComponent(s.token)}` }))),
        );
        for (const r of results) {
          if (r.ok) sent++;
          else failed++;
        }
      }
      await logActivity("campaign.sent", `${label} « ${texts.subject} » : ${sent} envoyé${sent > 1 ? "s" : ""}${failed ? `, ${failed} en échec` : ""}`, { kind, sent, failed }, "admin");
    } catch (e) {
      await logError("campaign.send", e, { kind });
    }
  });
  return { ok: true, message: `Envoi lancé à ${subscribers.length} inscrit${subscribers.length > 1 ? "s" : ""}. Suis-le dans le Journal (onglet E-mails).` };
}

/** Takes a subscriber off the list (as if they had clicked "Se désabonner"). */
export async function removeSubscriber(id: string): Promise<void> {
  await requireAdmin();
  const s = await db.subscriber.update({ where: { id: String(id) }, data: { unsubscribedAt: new Date() } }).catch(() => null);
  if (s) await logActivity("newsletter.removed", `Retiré de la newsletter : ${s.email}`, { email: s.email }, "admin");
  revalidatePath("/admin/emails");
}
