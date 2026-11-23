import "server-only";
import { COMPANY } from "@/lib/company";
import { C, FONT, button, esc, layout } from "./layout";
import type { Email } from "./send";
import type { Locale } from "@/lib/i18n";

/** How long the confirmation link works, in hours (the same value as `expiresIn` in src/server/auth.ts). */
export const VERIFY_HOURS = 24;

/**
 * The e-mail that confirms a new account's address: one button, the link Better Auth made.
 * Sent at sign-up, and again when someone tries to sign in before confirming.
 */
export function verifyEmail({ name, email, url, locale = "fr" }: { name: string; email: string; url: string; locale?: Locale }): Email {
  if (locale === "en") return verifyEmailEn({ name, email, url });
  const prenom = (name || email.split("@")[0]).trim().split(/\s+/)[0] ?? "";
  const subject = "Confirme ton adresse e-mail";
  const link = esc(url);

  const hero = `<p style="margin:0 0 14px;font-size:13px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:${C.orange};">Plus qu'une étape</p>
<h1 class="h1" style="margin:0 0 18px;font-size:46px;line-height:48px;font-weight:700;letter-spacing:-1.6px;color:${C.onNight};">Confirme ton adresse.</h1>
<p style="margin:0;font-size:17px;line-height:26px;color:${C.nightMuted};">Salut ${esc(prenom)}, clique sur le bouton pour activer ton compte ArtSyde. Tes crédits studio t'attendent juste après.</p>`;

  const body = `${button(link, "Confirmer mon adresse &nbsp;→")}
<p style="margin:24px 0 0;font-family:${FONT};font-size:14px;line-height:21px;color:${C.muted};">Le lien est valable ${VERIFY_HOURS} heures. Le bouton ne marche pas ? Copie cette adresse dans ton navigateur :</p>
<p style="margin:8px 0 0;font-family:${FONT};font-size:13px;line-height:19px;word-break:break-all;"><a href="${link}" style="color:${C.link};text-decoration:none;">${link}</a></p>
<div style="height:28px;line-height:28px;border-bottom:1px solid ${C.line};">&nbsp;</div>
<p style="margin:24px 0 0;font-family:${FONT};font-size:14px;line-height:21px;color:${C.muted};">Tu n'as pas créé de compte ArtSyde ? Ignore cet e-mail : sans confirmation, le compte reste inactif.</p>`;

  const text = [
    "Confirme ton adresse.",
    "",
    `Salut ${prenom}, ouvre ce lien pour activer ton compte ArtSyde :`,
    url,
    "",
    `Le lien est valable ${VERIFY_HOURS} heures.`,
    "Tu n'as pas créé de compte ArtSyde ? Ignore cet e-mail : sans confirmation, le compte reste inactif.",
    "",
    `ArtSyde · ${COMPANY.city}, ${COMPANY.country}`,
  ].join("\n");

  return {
    to: { email, name: name || undefined },
    subject,
    html: layout({ title: subject, preheader: "Un clic pour activer ton compte ArtSyde.", hero, body, reason: "Tu reçois cet e-mail parce que quelqu'un a créé un compte ArtSyde avec cette adresse." }),
    text,
    tags: ["verify-email"],
  };
}

/** The same e-mail in English (the /en site). */
function verifyEmailEn({ name, email, url }: { name: string; email: string; url: string }): Email {
  const first = (name || email.split("@")[0]).trim().split(/\s+/)[0] ?? "";
  const subject = "Confirm your email address";
  const link = esc(url);

  const hero = `<p style="margin:0 0 14px;font-size:13px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:${C.orange};">One more step</p>
<h1 class="h1" style="margin:0 0 18px;font-size:46px;line-height:48px;font-weight:700;letter-spacing:-1.6px;color:${C.onNight};">Confirm your address.</h1>
<p style="margin:0;font-size:17px;line-height:26px;color:${C.nightMuted};">Hi ${esc(first)}, click the button to activate your ArtSyde account. Your studio credits are waiting right after.</p>`;

  const body = `${button(link, "Confirm my address &nbsp;→")}
<p style="margin:24px 0 0;font-family:${FONT};font-size:14px;line-height:21px;color:${C.muted};">The link is valid for ${VERIFY_HOURS} hours. Button not working? Copy this address into your browser:</p>
<p style="margin:8px 0 0;font-family:${FONT};font-size:13px;line-height:19px;word-break:break-all;"><a href="${link}" style="color:${C.link};text-decoration:none;">${link}</a></p>
<div style="height:28px;line-height:28px;border-bottom:1px solid ${C.line};">&nbsp;</div>
<p style="margin:24px 0 0;font-family:${FONT};font-size:14px;line-height:21px;color:${C.muted};">Didn't create an ArtSyde account? Ignore this email: without confirmation, the account stays inactive.</p>`;

  const text = [
    "Confirm your address.",
    "",
    `Hi ${first}, open this link to activate your ArtSyde account:`,
    url,
    "",
    `The link is valid for ${VERIFY_HOURS} hours.`,
    "Didn't create an ArtSyde account? Ignore this email: without confirmation, the account stays inactive.",
    "",
    `ArtSyde · ${COMPANY.city}, ${COMPANY.country}`,
  ].join("\n");

  return {
    to: { email, name: name || undefined },
    subject,
    html: layout({ title: subject, preheader: "One click to activate your ArtSyde account.", hero, body, reason: "You're receiving this email because someone created an ArtSyde account with this address.", locale: "en" }),
    text,
    tags: ["verify-email", "en"],
  };
}
