import "server-only";
import { COMPANY } from "@/lib/company";

/*
 * The shared frame of ArtSyde's e-mails. E-mail clients (Gmail, Outlook, Apple Mail, phones) ignore most
 * of the web: layout is tables, every style is inline (the <style> block only adds phone tweaks for the
 * clients that read it), fonts fall back to the system's. Colours from the site's palette (globals.css).
 */

export const C = {
  page: "#f5f5f7",
  card: "#ffffff",
  ink: "#1d1d1f",
  muted: "#6e6e73",
  line: "#e8e8ed",
  accent: "#0071e3",
  link: "#0066cc",
  night: "#000000",
  night2: "#161617",
  onNight: "#f5f5f7",
  nightMuted: "#a1a1a6",
  orange: "#ff791b",
  whatsapp: "#25d366",
};
export const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

import { siteUrl } from "@/server/site";
export { siteUrl };

/** Escapes text going into HTML (a customer's name, for instance). */
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** A full-width pill button. `tone` "accent" (blue) or "whatsapp" (green). */
export function button(href: string, label: string, tone: "accent" | "whatsapp" | "light" = "accent") {
  const bg = tone === "whatsapp" ? C.whatsapp : tone === "light" ? C.card : C.accent;
  const fg = tone === "light" ? C.ink : "#ffffff";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="border-radius:980px;background:${bg};">
<a href="${href}" style="display:block;padding:16px 24px;font-family:${FONT};font-size:16px;font-weight:600;line-height:20px;color:${fg};text-decoration:none;border-radius:980px;text-align:center;">${label}</a>
</td></tr></table>`;
}

/**
 * A complete e-mail. `hero`: the black opening (title, photo); `body`: the white card; `preheader`: the line
 * inboxes show after the subject; `reason`: why the person receives it (bottom of the e-mail).
 */
export function layout({ title, preheader, hero, body, reason }: { title: string; preheader: string; hero: string; body: string; reason: string }) {
  const site = siteUrl();
  const footLink = (href: string, label: string) => `<a href="${href}" style="color:${C.muted};text-decoration:underline;">${label}</a>`;
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(title)}</title>
<style>
  @media (max-width: 600px) {
    .px { padding-left: 24px !important; padding-right: 24px !important; }
    .h1 { font-size: 36px !important; line-height: 40px !important; }
    .big { font-size: 64px !important; line-height: 64px !important; }
    .outer { padding: 12px 8px !important; }
  }
  a { text-decoration: none; }
</style>
</head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.page};">${esc(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
<tr><td align="center" class="outer" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">

    <!-- Top bar -->
    <tr><td class="px" style="background:${C.night};border-radius:28px 28px 0 0;padding:28px 44px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td><a href="${site}" style="font-family:${FONT};font-size:20px;font-weight:700;letter-spacing:-0.5px;color:${C.onNight};text-decoration:none;">ArtSyde</a></td>
        <td align="right" style="font-family:${FONT};font-size:12px;letter-spacing:0.4px;color:${C.nightMuted};">Imprimé à ${COMPANY.city}</td>
      </tr></table>
    </td></tr>

    <!-- Hero -->
    <tr><td class="px" style="background:${C.night};padding:44px 44px 40px;font-family:${FONT};color:${C.onNight};">
${hero}
    </td></tr>

    <!-- Card -->
    <tr><td class="px" style="background:${C.card};border-radius:0 0 28px 28px;padding:44px;font-family:${FONT};color:${C.ink};">
${body}
    </td></tr>

    <!-- Footer -->
    <tr><td class="px" style="padding:32px 44px 8px;font-family:${FONT};font-size:12px;line-height:19px;color:${C.muted};text-align:center;">
      <a href="${site}" style="font-size:15px;font-weight:700;letter-spacing:-0.3px;color:${C.ink};text-decoration:none;">ArtSyde</a><br>
      Ton t-shirt. Ton style. · ${COMPANY.city}, ${COMPANY.country}<br><br>
      ${footLink(`${site}/#boutique`, "Boutique")} &nbsp;·&nbsp; ${footLink(`${site}/studio`, "Studio 3D")} &nbsp;·&nbsp; ${footLink(`${site}/compte`, "Mon compte")}${COMPANY.whatsapp ? ` &nbsp;·&nbsp; ${footLink(COMPANY.whatsapp, "WhatsApp")}` : ""}<br><br>
      ${esc(reason)}<br>
      ${footLink(`${site}/conditions-d-utilisation`, "Conditions d'utilisation")}
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`;
}
