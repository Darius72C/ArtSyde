import { db } from "@/server/db";
import { sseResponse } from "@/server/live";

/** The shop's stock, live: sends "stock" when any blank t-shirt quantity changes (orders paid, deliveries…). */
export async function GET(request: Request) {
  let last: string | null = null;
  return sseResponse(
    request,
    async () => {
      const s = await db.colorStock.aggregate({ _max: { updatedAt: true }, _sum: { quantity: true }, _count: { _all: true } });
      const state = `${s._max.updatedAt?.toISOString() ?? ""}|${s._sum.quantity ?? 0}|${s._count._all}`;
      const changed = last !== null && state !== last;
      last = state;
      return changed ? [{ event: "stock", data: { at: new Date().toISOString() } }] : [];
    },
    { every: 5000 },
  );
}
