"use server";

import { randomUUID } from "node:crypto";
import { updateTag } from "next/cache";
import { db } from "@/server/db";
import { ADS_KEY, LEGACY_AD_KEY, PLACEMENTS, mergeAds, type AdBanner, type Placement } from "@/lib/ad";
import { deleteObject, keyFromPublicUrl, presign, r2Config } from "@/server/r2";
import { settingTag } from "@/server/settings";
import { logActivity } from "@/server/log";
import { requireAdmin } from "./auth";

/* The site's ad banners, from Admin > Accueil: each with its image on R2 (ads/), its words, link, button and place. */

const TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;
const MAX_SIZE = 20 * 1024 * 1024;

const ownAdImage = (url: string) => {
  const cfg = r2Config();
  const key = cfg ? keyFromPublicUrl(cfg, url) : null;
  return cfg && key?.startsWith("ads/") ? { cfg, key } : null;
};

export type AdPresign = { ok: true; uploadUrl: string; publicUrl: string; contentType: string } | { ok: false; message: string };

export async function presignAdImage(file: { type: string; size: number }): Promise<AdPresign> {
  await requireAdmin();
  const cfg = r2Config();
  if (!cfg) return { ok: false, message: "Le stockage des photos n'est pas configuré (variables R2_* dans .env)." };
  const ext = TYPES[file?.type as keyof typeof TYPES];
  if (!ext) return { ok: false, message: "Format accepté : JPG, PNG ou WebP." };
  const size = Number(file?.size);
  if (!Number.isInteger(size) || size <= 0 || size > MAX_SIZE) return { ok: false, message: "20 Mo maximum." };
  const key = `ads/${randomUUID()}.${ext}`;
  return { ok: true, uploadUrl: presign(cfg, "PUT", key, { "content-type": file.type, "content-length": String(size) }), publicUrl: `${cfg.publicUrl}/${key}`, contentType: file.type };
}

export type AdSaveResult = { ok: true; id: string } | { ok: false; field?: string; message: string };

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

/** Every banner as saved (not cached), the first version's one included. */
async function readAds(): Promise<AdBanner[]> {
  const rows = await db.siteSetting.findMany({ where: { key: { in: [ADS_KEY, LEGACY_AD_KEY] } } });
  return mergeAds(rows.find((r) => r.key === ADS_KEY)?.value, rows.find((r) => r.key === LEGACY_AD_KEY)?.value);
}

/** Writes the whole list (the first version's banner moves into it) and expires the site's copy. */
async function writeAds(ads: AdBanner[]) {
  const value = ads.map((a) => (a.id === "legacy" ? { ...a, id: randomUUID() } : a));
  await db.$transaction([
    db.siteSetting.upsert({ where: { key: ADS_KEY }, create: { key: ADS_KEY, value }, update: { value } }),
    db.siteSetting.deleteMany({ where: { key: LEGACY_AD_KEY } }),
  ]);
  updateTag(settingTag(ADS_KEY));
  updateTag(settingTag(LEGACY_AD_KEY));
  return value;
}

const dropImage = async (url: string | undefined) => {
  const own = url ? ownAdImage(url) : null;
  if (own) await deleteObject(own.cfg, own.key).catch(() => {});
};

/** Saves one banner (new, or the one with this id), switched on or off. A replaced image is deleted. */
export async function saveBanner(input: AdBanner): Promise<AdSaveResult> {
  await requireAdmin();
  const placement = input?.placement as Placement;
  const ad: AdBanner = {
    id: clip(input?.id, 60) || undefined,
    enabled: Boolean(input?.enabled),
    placement,
    image: clip(input?.image, 500),
    title: clip(input?.title, 70) || undefined,
    text: clip(input?.text, 140) || undefined,
    button: clip(input?.button, 30) || undefined,
    url: clip(input?.url, 500) || undefined,
    tone: input?.tone === "dark" ? "dark" : "light",
  };
  if (!placement || !(placement in PLACEMENTS)) return { ok: false, field: "placement", message: "Choisis où afficher la bannière." };
  if (ad.image && !ownAdImage(ad.image)) return { ok: false, field: "image", message: "Image refusée : envoie-la depuis ce formulaire." };
  if (ad.enabled && !ad.image) return { ok: false, field: "image", message: "Ajoute une image pour afficher la bannière." };
  if (ad.url && !/^(\/(?!\/)|https?:\/\/)/i.test(ad.url)) return { ok: false, field: "url", message: "Une page du site (/studio…) ou une adresse complète (https://…)." };
  if (ad.button && !ad.url) return { ok: false, field: "url", message: "Un bouton a besoin d'un lien." };

  const ads = await readAds();
  const at = ad.id ? ads.findIndex((a) => a.id === ad.id) : -1;
  const before = at >= 0 ? ads[at] : undefined;
  if (at >= 0) ads[at] = ad;
  else ads.push({ ...ad, id: randomUUID() });
  const saved = await writeAds(ads);
  const id = saved[at >= 0 ? at : saved.length - 1].id!;

  const where = PLACEMENTS[placement];
  await logActivity("ad.saved", `${ad.enabled ? "Bannière en ligne" : "Bannière masquée"} — ${where}${ad.title ? ` : « ${ad.title} »` : ""}`, { url: ad.url, placement }, "admin");
  if (before?.image && before.image !== ad.image) await dropImage(before.image);
  return { ok: true, id };
}

/** Removes one banner and its image. */
export async function deleteBanner(id: string): Promise<void> {
  await requireAdmin();
  const ads = await readAds();
  const gone = ads.find((a) => a.id === id);
  if (!gone) return;
  await writeAds(ads.filter((a) => a !== gone));
  await logActivity("ad.removed", `Bannière supprimée — ${gone.placement ? PLACEMENTS[gone.placement] : "accueil"}${gone.title ? ` : « ${gone.title} »` : ""}`, undefined, "admin");
  await dropImage(gone.image);
}
