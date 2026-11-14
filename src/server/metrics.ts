"use server";

import { headers } from "next/headers";
import { db } from "@/server/db";
import { METRICS, type Metric } from "@/lib/metrics";

/*
 * Counts one step of a visit (see src/lib/metrics.ts) in today's line of SiteSetting ("metrics.YYYY-MM-DD",
 * a JSON of counters), with one atomic statement. Anyone can call it, so it only takes the known names and a
 * few calls per visitor per minute.
 */
const recent = new Map<string, number[]>();

export async function trackEvent(name: Metric) {
  if (!(name in METRICS)) return;
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "?";
  const now = Date.now();
  const times = (recent.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (times.length >= 30) return;
  recent.set(ip, [...times, now]);
  if (recent.size > 5000) recent.clear();
  const key = `metrics.${new Date().toISOString().slice(0, 10)}`;
  try {
    await db.$executeRaw`
      INSERT INTO "SiteSetting" ("key", "value", "updatedAt")
      VALUES (${key}, jsonb_build_object(${name}::text, 1), NOW())
      ON CONFLICT ("key") DO UPDATE SET
        "value" = jsonb_set("SiteSetting"."value", ARRAY[${name}::text], to_jsonb(COALESCE(("SiteSetting"."value" ->> ${name}::text)::int, 0) + 1)),
        "updatedAt" = NOW()`;
  } catch {
    // a lost count is not worth an error for the visitor
  }
}
