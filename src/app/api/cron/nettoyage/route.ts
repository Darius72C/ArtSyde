import { timingSafeEqual } from "node:crypto";
import { db } from "@/server/db";
import { deleteObject, keyFromPublicUrl, listObjects, r2Config } from "@/server/r2";
import { forgetOldHits } from "@/server/rate-limit";
import { logActivity, logError } from "@/server/log";

/*
 * The daily clean-up, run by Vercel Cron (vercel.json) at 03:00 UTC:
 * - deletes the print files (designs/) no order points to, once they are 14 days old. They are uploaded when a
 *   custom t-shirt goes into the cart; most are ordered, the rest (carts left behind, abuse) would pile up.
 *   14 days leaves time for a cart kept a while before it is ordered.
 * - forgets the anti-abuse counters older than a day (table RateHit).
 * Vercel calls it with "Authorization: Bearer <CRON_SECRET>"; anything else is refused.
 */

const KEEP_DAYS = 14;
const MAX_DELETES = 2000; // per run: a big backlog is cleared over several days

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });

  const report: { hitsForgotten: number; filesSeen: number; filesDeleted: number; mbFreed: number; skipped?: string } = { hitsForgotten: 0, filesSeen: 0, filesDeleted: 0, mbFreed: 0 };
  try {
    report.hitsForgotten = await forgetOldHits();

    const cfg = r2Config();
    if (!cfg) {
      report.skipped = "R2 non configuré";
    } else {
      const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
      const files = await listObjects(cfg, "designs/");
      report.filesSeen = files.length;
      const old = files.filter((f) => f.lastModified.getTime() < cutoff);
      if (old.length) {
        // Every print file an order points to, whatever its status: those are never deleted.
        const used = new Set(
          (await db.customDesign.findMany({ select: { fileUrl: true } })).map((d) => keyFromPublicUrl(cfg, d.fileUrl)).filter((k): k is string => Boolean(k)),
        );
        for (const f of old) {
          if (used.has(f.key)) continue;
          if (report.filesDeleted >= MAX_DELETES) break;
          await deleteObject(cfg, f.key);
          report.filesDeleted++;
          report.mbFreed += f.size / (1024 * 1024);
        }
      }
    }
    report.mbFreed = Math.round(report.mbFreed);
    if (report.filesDeleted) {
      await logActivity("cleanup.print_files", `Nettoyage : ${report.filesDeleted} fichier(s) d'impression jamais commandé(s) supprimé(s) (${report.mbFreed} Mo libérés)`, report, "système");
    }
    return Response.json(report);
  } catch (e) {
    await logError("cron.nettoyage", e, report);
    return Response.json({ error: "clean-up failed", ...report }, { status: 500 });
  }
}
