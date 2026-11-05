import { db } from "@/server/db";
import { isAdmin } from "@/server/admin/auth";
import { cursorFrom, sseResponse } from "@/server/live";

/** What the admin is told about live: new orders and credit purchases, and the rest of the activity. */
const ALERT = new Set(["order.placed", "credits.requested"]);

/**
 * The admin's live stream: every new activity line (orders, payments, stock…) and new errors, as they happen.
 * "alert" events (a new order, a credit purchase) also ring and notify in the admin (LiveAdmin).
 */
export async function GET(request: Request) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  let cursor = cursorFrom(request);
  return sseResponse(request, async () => {
    const rows = await db.logEntry
      .findMany({
        where: { createdAt: { gt: cursor }, kind: { in: ["ACTIVITY", "ERROR"] } },
        orderBy: { createdAt: "asc" },
        take: 50,
        select: { id: true, kind: true, action: true, message: true, createdAt: true, meta: true },
      })
      .catch((e: { code?: string }) => {
        // The journal's table not created yet (pnpm db:deploy): nothing to send, quietly.
        if (e?.code === "P2021") return [];
        throw e;
      });
    if (rows.length) cursor = rows[rows.length - 1].createdAt;
    return rows.map((r) => ({
      id: r.createdAt.toISOString(),
      event: r.kind === "ERROR" ? "error" : ALERT.has(r.action) ? "alert" : "activity",
      data: { action: r.action, message: r.message, at: r.createdAt.toISOString(), reference: (r.meta as { reference?: string } | null)?.reference },
    }));
  });
}
