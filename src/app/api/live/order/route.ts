import { db } from "@/server/db";
import { orderKey } from "@/lib/orders";
import { sseResponse } from "@/server/live";

/**
 * A customer's order, live: `?ref=AS-…&k=<key>` (the key the checkout gave, as on the tracking page).
 * Sends "order" when its status or payment changes (marked paid, shipped, delivered…).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ref = url.searchParams.get("ref") ?? "";
  const key = url.searchParams.get("k") ?? "";
  const o = await db.order.findUnique({ where: { reference: ref }, select: { id: true } }).catch(() => null);
  if (!o || orderKey(o.id) !== key) return new Response("Not found", { status: 404 });

  let last: string | null = null;
  return sseResponse(
    request,
    async () => {
      const now = await db.order.findUnique({ where: { id: o.id }, select: { status: true, paymentStatus: true, updatedAt: true } });
      if (!now) return [];
      const state = `${now.status}|${now.paymentStatus}|${now.updatedAt.toISOString()}`;
      const changed = last !== null && state !== last;
      last = state;
      return changed ? [{ event: "order", data: { status: now.status, payment: now.paymentStatus } }] : [];
    },
    { every: 4000 },
  );
}
