import { db } from "@/server/db";
import { sseResponse } from "@/server/live";

/** A fingerprint of the stock: it changes when any blank t-shirt quantity does. */
async function stockState() {
  const s = await db.colorStock.aggregate({ _max: { updatedAt: true }, _sum: { quantity: true }, _count: { _all: true } });
  return `${s._max.updatedAt?.toISOString() ?? ""}|${s._sum.quantity ?? 0}|${s._count._all}`;
}

/**
 * The shop's stock. `?poll=1` (the shop's pages, see StockWatch): the fingerprint as JSON, cached 30 s by the
 * CDN, so most checks never wake a function. Without it: the live stream, sending "stock" when it changes.
 */
export async function GET(request: Request) {
  if (new URL(request.url).searchParams.get("poll")) {
    const state = await stockState().catch(() => null);
    return Response.json({ state }, { headers: { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60" } });
  }
  let last: string | null = null;
  return sseResponse(
    request,
    async () => {
      const state = await stockState();
      const changed = last !== null && state !== last;
      last = state;
      return changed ? [{ event: "stock", data: { at: new Date().toISOString() } }] : [];
    },
    { every: 5000 },
  );
}
