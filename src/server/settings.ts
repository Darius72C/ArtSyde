import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/server/db";

/*
 * Settings changed from the admin without redeploying (SiteSetting): the home page's ad banner, the e-mails'
 * texts… Read cached; the admin's save expires the key's tag (settingTag) so the site shows it right away.
 */

export const settingTag = (key: string) => `setting:${key}`;

async function read(key: string): Promise<unknown> {
  "use cache";
  cacheTag(settingTag(key));
  cacheLife("hours");
  return (await db.siteSetting.findUnique({ where: { key } }))?.value ?? null;
}

/** A setting's value, or null (not set, or the table not there yet). */
export async function getSetting<T>(key: string): Promise<T | null> {
  try {
    return (await read(key)) as T | null;
  } catch (e) {
    console.error(`[settings] ${key} unavailable`, e instanceof Error ? e.message : e);
    return null;
  }
}
