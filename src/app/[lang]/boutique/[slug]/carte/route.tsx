import { ImageResponse } from "next/og";
import qrcode from "qrcode-generator";
import { getProduct } from "@/server/catalog";
import { formatFCFA, productHref } from "@/lib/products";
import { PRODUCTION_URL } from "@/lib/site";
import { isLocale, localizeHref, makeT } from "@/lib/i18n";

/*
 * A product's share card, drawn on the server:
 * - /boutique/<slug>/carte?format=og : the 1200×630 preview shown by WhatsApp, Facebook, X… when the product's
 *   link is pasted (declared in the page's metadata);
 * - /boutique/<slug>/carte : a 1080×1920 story card with a QR code and the address, to post or send. The
 *   link leads straight to the product.
 */

const INK = "#1d1d1f", MUTED = "#6e6e73", SURFACE = "#f5f5f7";

/** Inter from Google Fonts (TTF, which the renderer reads); the default font if it can't be fetched. */
async function inter(weight: 600 | 800): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Inter:wght@${weight}`, { next: { revalidate: 86400 } })).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
    return url ? await (await fetch(url, { next: { revalidate: 86400 } })).arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** The QR code of `text`, as an SVG data URL. */
function qrSvg(text: string): string {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + 2} ${r + 2}h1v1h-1z`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n + 4} ${n + 4}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="${INK}"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export async function GET(req: Request, { params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  const locale = isLocale(lang) ? lang : "fr";
  const t = makeT(locale);
  const p = await getProduct(slug);
  if (!p) return new Response(t("Produit introuvable"), { status: 404 });
  const og = new URL(req.url).searchParams.get("format") === "og";
  const link = `${PRODUCTION_URL}${localizeHref(locale, productHref(p))}`;
  const shortLink = link.replace(/^https?:\/\/(www\.)?/, "");
  const [semi, bold] = await Promise.all([inter(600), inter(800)]);
  const fonts = [
    ...(semi ? [{ name: "Inter", data: semi, weight: 600 as const, style: "normal" as const }] : []),
    ...(bold ? [{ name: "Inter", data: bold, weight: 800 as const, style: "normal" as const }] : []),
  ];
  const price = formatFCFA(p.price);
  const photo = p.photo ?? p.photos[0];
  const cache = { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" };

  if (og)
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", background: SURFACE, fontFamily: "Inter", color: INK }}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- drawn by the image renderer, not a page
            <img src={photo} alt="" width={630} height={630} style={{ width: 630, height: 630, objectFit: "cover" }} />
          ) : (
            <div style={{ width: 630, height: 630, display: "flex", background: "#e8e8ed" }} />
          )}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 52px" }}>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 800, letterSpacing: 6 }}>ARTSYDE</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {p.tag && <div style={{ display: "flex", fontSize: 24, fontWeight: 600, color: "#bf4800", marginBottom: 12 }}>{t(p.tag)}</div>}
              <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2 }}>{p.name}</div>
              <div style={{ display: "flex", fontSize: 36, fontWeight: 600, marginTop: 18 }}>{price}</div>
              <div style={{ display: "flex", fontSize: 24, fontWeight: 600, color: MUTED, marginTop: 10 }}>{t("Tailles {sizes} · imprimé à la commande", { sizes: p.sizes.join(", ") })}</div>
            </div>
            <div style={{ display: "flex", alignSelf: "flex-start", padding: "14px 26px", borderRadius: 999, background: "#0071e3", color: "#fff", fontSize: 24, fontWeight: 600 }}>{shortLink}</div>
          </div>
        </div>
      ),
      { width: 1200, height: 630, fonts, headers: cache },
    );

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#fff", fontFamily: "Inter", color: INK, padding: 72 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800, letterSpacing: 9 }}>ARTSYDE</div>
          {p.tag && <div style={{ display: "flex", padding: "10px 22px", borderRadius: 999, background: SURFACE, fontSize: 28, fontWeight: 600, color: "#bf4800" }}>{t(p.tag)}</div>}
        </div>
        <div style={{ display: "flex", marginTop: 48, width: 936, height: 1080, borderRadius: 48, overflow: "hidden", background: SURFACE }}>
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element -- drawn by the image renderer, not a page
            <img src={photo} alt="" width={936} height={1080} style={{ width: 936, height: 1080, objectFit: "cover" }} />
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 56 }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 560 }}>
            <div style={{ display: "flex", fontSize: 92, fontWeight: 800, lineHeight: 1, letterSpacing: -3 }}>{p.name}</div>
            <div style={{ display: "flex", fontSize: 46, fontWeight: 600, marginTop: 20 }}>{price}</div>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 600, color: MUTED, marginTop: 14 }}>{t("Tailles {sizes}", { sizes: p.sizes.join(", ") })}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- drawn by the image renderer, not a page */}
            <img src={qrSvg(link)} alt="" width={260} height={260} style={{ width: 260, height: 260, borderRadius: 20 }} />
            <div style={{ display: "flex", fontSize: 24, fontWeight: 600, color: MUTED, marginTop: 12 }}>{t("Scanne pour commander")}</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: "auto", padding: "22px 0", borderRadius: 999, background: INK, color: "#fff", fontSize: 34, fontWeight: 600 }}>{shortLink}</div>
      </div>
    ),
    { width: 1080, height: 1920, fonts, headers: cache },
  );
}
