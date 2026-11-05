import "server-only";
import type { AdBanner } from "@/lib/ad";
import { fillName, type CampaignKind, type CampaignTexts } from "@/lib/campaigns";
import { formatFCFA, type Product } from "@/lib/products";
import { C, FONT, button, esc, layout, siteUrl } from "./layout";
import type { Email } from "./send";

/** A link typed in the admin as a full address: a page of the site gets the site's address in front. */
const full = (url: string) => (url.startsWith("/") ? `${siteUrl()}${url}` : url);

const REASON = "Tu reçois cet e-mail parce que tu es inscrit à la newsletter ArtSyde.";

/** The latest t-shirts as a two-column grid (one column on phones that read the <style>). */
function productGrid(products: Product[]) {
  const site = siteUrl();
  const cell = (p: Product) => `<td class="col" width="50%" valign="top" style="padding:0 8px 22px;font-family:${FONT};">
  <a href="${site}/boutique/${esc(p.slug)}" style="display:block;text-decoration:none;color:${C.ink};">
    ${p.photo ? `<img src="${esc(p.photo)}" width="240" alt="${esc(p.name)}" style="display:block;width:100%;max-width:240px;height:auto;border:0;border-radius:16px;background:${C.page};">` : `<div style="height:200px;border-radius:16px;background:${C.page};"></div>`}
    <p style="margin:12px 0 2px;font-size:16px;line-height:22px;font-weight:700;color:${C.ink};">${esc(p.name)}</p>
    <p style="margin:0;font-size:14px;line-height:20px;color:${C.muted};">${p.oldPrice ? `<s>${formatFCFA(p.oldPrice)}</s> &nbsp;` : ""}${formatFCFA(p.price)}</p>
  </a>
</td>`;
  const rows: string[] = [];
  for (let i = 0; i < products.length; i += 2) {
    const [a, b] = [products[i], products[i + 1]];
    rows.push(`<tr>${cell(a)}${b ? cell(b) : `<td class="col" width="50%" style="padding:0 8px;"></td>`}</tr>`);
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows.join("")}</table>`;
}

/**
 * A newsletter, promotion or announcement, for one subscriber.
 * `products`: the latest t-shirts (newsletter); `image`: the photo used when the draft sets none;
 * `unsubscribe`: this subscriber's link (none in previews and tests: the unsubscribe page instead).
 */
export function campaignEmail(
  kind: CampaignKind,
  texts: CampaignTexts,
  { name, email, image, products = [], ad, unsubscribe }: { name?: string | null; email: string; image?: string; products?: Product[]; ad?: AdBanner; unsubscribe?: string },
): Email {
  const site = siteUrl();
  const prenom = (name ?? "").trim().split(/\s+/)[0] ?? "";
  const t = (k: keyof CampaignTexts) => fillName(texts[k], prenom);
  const h = (k: keyof CampaignTexts) => esc(t(k)).replace(/\n/g, "<br>");
  const photo = texts.image || image;
  const href = texts.url ? full(texts.url) : site;
  const shown = kind === "newsletter" ? products.slice(0, Math.min(6, Math.max(0, Number(texts.products) || 0))) : [];
  const unsub = unsubscribe ?? `${site}/desabonnement`;

  const hero = `${texts.eyebrow ? `<p style="margin:0 0 14px;font-size:13px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:${C.orange};">${h("eyebrow")}</p>` : ""}
<h1 class="h1" style="margin:0 0 18px;font-size:46px;line-height:48px;font-weight:700;letter-spacing:-1.6px;color:${C.onNight};">${h("title")}</h1>
${texts.intro ? `<p style="margin:0;font-size:17px;line-height:26px;color:${C.nightMuted};">${h("intro")}</p>` : ""}
${photo ? `<a href="${esc(href)}" style="display:block;margin-top:32px;"><img src="${esc(photo)}" width="512" alt="" style="display:block;width:100%;max-width:512px;height:auto;border:0;border-radius:20px;"></a>` : ""}`;

  const offer =
    kind === "promo" && (texts.discount || texts.code)
      ? `<!-- Offer -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="background:${C.night2};border-radius:22px;padding:30px;text-align:center;font-family:${FONT};">
  ${texts.discount ? `<p class="big" style="margin:0;font-size:76px;line-height:80px;font-weight:700;letter-spacing:-3px;color:${C.onNight};">${h("discount")}</p>` : ""}
  ${texts.discountText ? `<p style="margin:6px 0 0;font-size:16px;line-height:22px;color:${C.nightMuted};">${h("discountText")}</p>` : ""}
  ${
    texts.code
      ? `<p style="margin:22px 0 0;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${C.nightMuted};">Ton code</p>
  <p style="margin:8px 0 0;"><span style="display:inline-block;padding:12px 22px;border:2px dashed ${C.orange};border-radius:14px;font-size:24px;line-height:28px;font-weight:700;letter-spacing:3px;color:${C.onNight};">${h("code")}</span></p>`
      : ""
  }
  ${texts.until ? `<p style="margin:18px 0 0;font-size:14px;line-height:20px;color:${C.orange};font-weight:600;">${h("until")}</p>` : ""}
</td></tr>
</table>
<div style="height:28px;line-height:28px;">&nbsp;</div>`
      : "";

  const grid = shown.length
    ? `${texts.productsTitle ? `<p style="margin:0 0 20px;font-family:${FONT};font-size:22px;line-height:28px;font-weight:700;letter-spacing:-0.5px;color:${C.ink};">${h("productsTitle")}</p>` : ""}
${productGrid(shown)}
<div style="height:6px;line-height:6px;">&nbsp;</div>`
    : "";

  const words = texts.body ? `<p style="margin:0 0 28px;font-family:${FONT};font-size:16px;line-height:25px;color:${C.muted};">${h("body")}</p>` : "";
  const cta = texts.button ? button(esc(href), `${h("button")} &nbsp;→`) : "";
  const body = `${offer}${grid}${words}${cta}` || "&nbsp;";

  const subject = t("subject");
  const lines = [
    t("eyebrow"),
    t("title"),
    "",
    t("intro"),
    ...(kind === "promo" ? ["", [t("discount"), t("discountText")].filter(Boolean).join(" "), texts.code ? `Code : ${t("code")}` : "", t("until")] : []),
    ...(shown.length ? ["", t("productsTitle"), ...shown.map((p) => `- ${p.name}, ${formatFCFA(p.price)} : ${site}/boutique/${p.slug}`)] : []),
    "",
    t("body"),
    "",
    texts.button ? `${t("button")} : ${href}` : "",
    ...(ad ? ["", [ad.title, ad.text].filter(Boolean).join(" — "), ad.url ? full(ad.url) : ""] : []),
    "",
    REASON,
    `Se désabonner : ${unsub}`,
  ];
  // No empty line twice in a row.
  const text = lines
    .filter((l, i) => l !== "" || (i > 0 && lines[i - 1] !== ""))
    .join("\n")
    .trim();

  return {
    to: { email, name: name || undefined },
    subject,
    html: layout({ title: subject, preheader: t("preheader"), hero, body, reason: REASON, ad, unsubscribe: unsub }),
    text,
    tags: [kind],
    // One-click "Se désabonner" next to the sender in Gmail and Apple Mail (POST to the API route).
    ...(unsubscribe ? { headers: { "List-Unsubscribe": `<${unsubscribe.replace("/desabonnement?", "/api/newsletter/unsubscribe?")}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
  };
}
