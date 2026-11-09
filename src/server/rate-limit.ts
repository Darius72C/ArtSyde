import "server-only";
import { headers } from "next/headers";
import { db } from "@/server/db";

/*
 * Simple limits counted in the database (table RateHit), so they hold across all of Vercel's server instances,
 * unlike a counter kept in memory. Used for public server actions that anyone can call directly, without going
 * through the site's pages.
 */

/** The visitor's IP address, as Vercel gives it (it sets these headers itself: a browser can't fake them). */
export async function clientIp() {
  const h = await headers();
  return h.get("x-real-ip")?.trim() || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "inconnue";
}

/**
 * Counts one pass in `bucket` and says whether it is allowed: false once `max` passes were counted in the last
 * `windowMs`. A refused pass is not counted. If the database can't be reached, the pass is allowed (the limit is
 * a guard against abuse, not something the shop should break over).
 */
export async function allow(bucket: string, max: number, windowMs: number): Promise<boolean> {
  try {
    const since = new Date(Date.now() - windowMs);
    const count = await db.rateHit.count({ where: { bucket, at: { gt: since } } });
    if (count >= max) return false;
    await db.rateHit.create({ data: { bucket } });
    return true;
  } catch (e) {
    console.error("rate limit unavailable", e);
    return true;
  }
}

/** How many passes `bucket` counted in the last `windowMs` (0 if the database can't be reached). */
export async function hits(bucket: string, windowMs: number) {
  try {
    return await db.rateHit.count({ where: { bucket, at: { gt: new Date(Date.now() - windowMs) } } });
  } catch (e) {
    console.error("rate limit unavailable", e);
    return 0;
  }
}

/** Counts one pass in `bucket` (for limits on failures only: counted after the fact). */
export async function record(bucket: string) {
  await db.rateHit.create({ data: { bucket } }).catch((e) => console.error("rate limit unavailable", e));
}

/** Forgets the passes older than a day (called by the daily clean-up). */
export async function forgetOldHits() {
  const { count } = await db.rateHit.deleteMany({ where: { at: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
  return count;
}
