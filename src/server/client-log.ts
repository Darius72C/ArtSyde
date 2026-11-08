"use server";

import { headers } from "next/headers";
import { logError } from "@/server/log";

/*
 * Errors that happen in the browser (an upload refused by the storage, a page that crashed), sent to the
 * journal's "Erreurs" so the admin sees them too. Anyone can call this, so it only takes known places
 * and short texts, and keeps at most a few lines per visitor per minute.
 */

const WHERE = { "studio.upload": "Studio : envoi du fichier d'impression", "page.crash": "Page en erreur", "admin.crash": "Admin : page en erreur" } as const;
export type ClientErrorPlace = keyof typeof WHERE;

const recent = new Map<string, number[]>();

export async function reportClientError(where: ClientErrorPlace, message: string, meta?: { path?: string; digest?: string }) {
  if (!(where in WHERE)) return;
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "?";
  const now = Date.now();
  const times = (recent.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (times.length >= 5) return;
  recent.set(ip, [...times, now]);
  if (recent.size > 5000) recent.clear();
  const text = `${WHERE[where]} — ${String(message).slice(0, 300)}`;
  await logError(`client.${where}`, new Error(text), {
    path: typeof meta?.path === "string" ? meta.path.slice(0, 200) : undefined,
    digest: typeof meta?.digest === "string" ? meta.digest.slice(0, 64) : undefined,
    userAgent: h.get("user-agent")?.slice(0, 200),
  });
}
