import "server-only";
import { COMPANY } from "@/lib/company";
import { DEFAULT_WELCOME, WELCOME_KEY, fill, mergeWelcome, type WelcomeTexts } from "@/lib/email-texts";
import { getSetting } from "@/server/settings";
import { C, FONT, button, esc, layout, siteUrl } from "./layout";
import type { Email } from "./send";

/** The welcome e-mail's words as set in Admin > E-mails (the defaults where a field is empty). */
export async function welcomeTexts(): Promise<WelcomeTexts> {
  return mergeWelcome(await getSetting<Partial<WelcomeTexts>>(WELCOME_KEY));
}

/**
 * The welcome e-mail, sent once when an account is created (Google or e-mail).
 * `image`: a photo of the collection for the opening (a public https URL), or none.
 * `texts`: its words (welcomeTexts()); the defaults when not given.
 */
export function welcomeEmail({ name, email, credits, image, texts = DEFAULT_WELCOME }: { name: string; email: string; credits: number; image?: string; texts?: WelcomeTexts }): Email {
  const site = siteUrl();
  const prenom = (name || email.split("@")[0]).trim().split(/\s+/)[0];
  const t = (k: keyof WelcomeTexts) => fill(texts[k], { prenom, credits });
  // Escaped for HTML; a line break typed in the admin stays a line break.
  const h = (k: keyof WelcomeTexts) => esc(t(k)).replace(/\n/g, "<br>");
  const subject = t("subject");

  const hero = `<p style="margin:0 0 14px;font-size:13px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:${C.orange};">${h("eyebrow")}</p>
<h1 class="h1" style="margin:0 0 18px;font-size:46px;line-height:48px;font-weight:700;letter-spacing:-1.6px;color:${C.onNight};">${h("title")}</h1>
<p style="margin:0;font-size:17px;line-height:26px;color:${C.nightMuted};">${h("intro")}</p>
${
  image
    ? `<a href="${site}/#boutique" style="display:block;margin-top:32px;"><img src="${esc(image)}" width="512" alt="La collection ArtSyde" style="display:block;width:100%;max-width:512px;height:auto;border:0;border-radius:20px;"></a>`
    : ""
}`;

  const step = (n: number, title: string, text: string, last = false) => `<tr>
  <td width="44" valign="top" style="padding:0 0 ${last ? 0 : 22}px;"><div style="width:32px;height:32px;border-radius:16px;background:${C.accent};font-family:${FONT};font-size:14px;font-weight:700;line-height:32px;text-align:center;color:#ffffff;">${n}</div></td>
  <td valign="top" style="padding:5px 0 ${last ? 0 : 22}px;font-family:${FONT};font-size:15px;line-height:22px;color:${C.muted};"><strong style="font-size:16px;color:${C.ink};">${title}</strong><br>${text}</td>
</tr>`;

  const body = `<!-- Gift -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:${C.night2};border-radius:22px;padding:28px 30px;">
  <p style="margin:0 0 6px;font-family:${FONT};"><span style="display:inline-block;padding:4px 10px;border-radius:980px;background:${C.orange};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#ffffff;">${h("giftBadge")}</span></p>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td valign="middle" class="big" style="padding:6px 20px 0 0;font-family:${FONT};font-size:76px;line-height:76px;font-weight:700;letter-spacing:-3px;color:${C.onNight};">${credits}</td>
    <td valign="middle" style="padding-top:8px;font-family:${FONT};font-size:15px;line-height:22px;color:${C.nightMuted};"><strong style="font-size:18px;color:${C.onNight};">${h("giftTitle")}</strong><br>${h("giftText")}</td>
  </tr></table>
</td></tr>
</table>

<div style="height:28px;line-height:28px;">&nbsp;</div>
${button(`${site}/studio`, `${h("button")} &nbsp;→`)}
<p style="margin:16px 0 0;text-align:center;font-family:${FONT};font-size:15px;line-height:22px;"><a href="${site}/#boutique" style="color:${C.link};text-decoration:none;">${h("link")} ›</a></p>

<div style="height:40px;line-height:40px;border-bottom:1px solid ${C.line};">&nbsp;</div>
<div style="height:36px;line-height:36px;">&nbsp;</div>

<!-- Steps -->
<p style="margin:0 0 22px;font-family:${FONT};font-size:22px;line-height:28px;font-weight:700;letter-spacing:-0.5px;color:${C.ink};">${h("stepsTitle")}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${step(1, h("step1Title"), h("step1Text"))}
${step(2, h("step2Title"), h("step2Text"))}
${step(3, h("step3Title"), h("step3Text"), true)}
</table>

<div style="height:40px;line-height:40px;">&nbsp;</div>

<!-- Help -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:${C.page};border-radius:22px;padding:26px 28px;font-family:${FONT};">
  <p style="margin:0 0 4px;font-size:17px;line-height:24px;font-weight:700;color:${C.ink};">${h("helpTitle")}</p>
  <p style="margin:0 0 ${COMPANY.whatsapp ? 18 : 0}px;font-size:15px;line-height:22px;color:${C.muted};">${h("helpText")}</p>
  ${COMPANY.whatsapp ? button(COMPANY.whatsapp, "Écrire sur WhatsApp", "whatsapp") : ""}
</td></tr>
</table>`;

  const text = [
    t("title"),
    "",
    t("intro"),
    "",
    `${t("giftBadge")} : ${credits} ${t("giftTitle")}. ${t("giftText")}`,
    "",
    `${t("button")} : ${site}/studio`,
    `${t("link")} : ${site}/#boutique`,
    "",
    t("stepsTitle"),
    `1. ${t("step1Title")} : ${t("step1Text")}`,
    `2. ${t("step2Title")} : ${t("step2Text")}`,
    `3. ${t("step3Title")} : ${t("step3Text")}`,
    "",
    `${t("helpTitle")} ${t("helpText")}${COMPANY.whatsapp ? ` WhatsApp : ${COMPANY.whatsapp}` : ""}`,
    "",
    `ArtSyde · ${COMPANY.city}, ${COMPANY.country}`,
    "Tu reçois cet e-mail parce que tu viens de créer un compte ArtSyde.",
  ].join("\n");

  return {
    to: { email, name: name || undefined },
    subject,
    html: layout({ title: subject, preheader: t("preheader"), hero, body, reason: "Tu reçois cet e-mail parce que tu viens de créer un compte ArtSyde." }),
    text,
    tags: ["welcome"],
  };
}
