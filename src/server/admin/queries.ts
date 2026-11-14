import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { db } from "@/server/db";
import { Prisma, type OrderStatus } from "@/generated/prisma/client";
import { TEE_COLORS } from "@/lib/data";
import { TO_HANDLE, colorName } from "@/lib/admin/labels";
import { requireAdmin } from "./auth";

/*
 * Every read the admin makes. All of them run at request time (the admin is a live
 * monitor, nothing is cached) and go through `load`, which turns "the database is
 * not set up yet" into something a page can show instead of crashing.
 */

export type DbProblem = "config" | "schema" | "connection";
export type Loaded<T> = { data: T; problem?: undefined } | { data?: undefined; problem: DbProblem };

const CONNECTION_CODES = new Set(["P1000", "P1001", "P1002", "P1003", "P1010", "P1017"]);

export async function load<T>(read: () => Promise<T>): Promise<Loaded<T>> {
  await connection();
  // Checked here, next to the data, on top of the redirect in proxy.ts.
  await requireAdmin();
  if (!process.env.DATABASE_URL) return { problem: "config" };
  try {
    return { data: await read() };
  } catch (e) {
    // P2021 / P2022: a table or column is missing, i.e. the migrations have not run.
    if (e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2021" || e.code === "P2022")) return { problem: "schema" };
    if (e instanceof Prisma.PrismaClientKnownRequestError && CONNECTION_CODES.has(e.code)) return { problem: "connection" };
    if (e instanceof Prisma.PrismaClientInitializationError) return { problem: "connection" };
    throw e;
  }
}

const DAY = 86_400_000;
const since = (days: number) => new Date(Date.now() - days * DAY);
/** Money counts only once the payment went through. */
const PAID = { paymentStatus: "PAID" } as const;
const pct = (now: number, before: number) => (before ? Math.round(((now - before) / before) * 100) : null);

// ---------- Orders ----------

const orderRow = {
  id: true,
  reference: true,
  createdAt: true,
  status: true,
  paymentStatus: true,
  paymentMethod: true,
  delivery: true,
  customerName: true,
  city: true,
  totalXof: true,
  items: { select: { quantity: true } },
} satisfies Prisma.OrderSelect;
export type OrderRow = Prisma.OrderGetPayload<{ select: typeof orderRow }>;

export const statusCounts = cache(async () => {
  const rows = await db.order.groupBy({ by: ["status"], _count: { _all: true } });
  return Object.fromEntries(rows.map((r) => [r.status, r._count._all])) as Partial<Record<OrderStatus, number>>;
});

export async function getOrders({ status, q }: { status?: OrderStatus; q?: string }) {
  const search = q?.trim();
  const where: Prisma.OrderWhereInput = {
    ...(status && { status }),
    ...(search && {
      OR: [
        { reference: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search.replace(/\s+/g, "") } },
        { customerPhone: { contains: search } },
        { city: { contains: search, mode: "insensitive" } },
      ],
    }),
  };
  const [orders, total, counts] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, select: orderRow }),
    db.order.count({ where }),
    statusCounts(),
  ]);
  return { orders, total, counts };
}

export async function getOrder(reference: string) {
  return db.order.findUnique({
    where: { reference },
    include: {
      customer: { select: { id: true, name: true, createdAt: true, _count: { select: { orders: true } } } },
      items: {
        include: {
          product: { select: { name: true, art: true, mockups: true } },
          savedDesign: { select: { name: true } },
          customDesigns: { orderBy: { layer: "asc" } },
        },
      },
    },
  });
}

// ---------- Overview ----------

export async function getOverview() {
  const [sales30, salesBefore, counts, customers, newCustomers, packs30, recent, lowStock, designs, metricRows] = await Promise.all([
    db.order.aggregate({ where: { ...PAID, createdAt: { gte: since(30) } }, _sum: { totalXof: true }, _count: { _all: true } }),
    db.order.aggregate({ where: { ...PAID, createdAt: { gte: since(60), lt: since(30) } }, _sum: { totalXof: true } }),
    statusCounts(),
    db.customer.count(),
    db.customer.count({ where: { createdAt: { gte: since(30) } } }),
    db.creditEntry.aggregate({ where: { reason: "PURCHASE", createdAt: { gte: since(30) } }, _sum: { priceXof: true }, _count: { _all: true } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: orderRow }),
    db.colorStock.findMany({ where: { quantity: { lte: db.colorStock.fields.lowAt } }, orderBy: [{ quantity: "asc" }, { colorName: "asc" }] }),
    db.savedDesign.findMany({ orderBy: { createdAt: "desc" }, take: 4, include: { customer: { select: { name: true } } } }),
    // the visit counters of the last 30 days (src/server/metrics.ts): one line per day
    db.siteSetting.findMany({ where: { key: { gte: `metrics.${since(29).toISOString().slice(0, 10)}`, lt: "metrics.~" } }, select: { value: true } }),
  ]);
  const revenue = sales30._sum.totalXof ?? 0;
  return {
    revenue,
    revenueDelta: pct(revenue, salesBefore._sum.totalXof ?? 0),
    paidOrders: sales30._count._all,
    toHandle: TO_HANDLE.reduce((n, s) => n + (counts[s] ?? 0), 0),
    toPay: counts.PENDING_PAYMENT ?? 0,
    counts,
    customers,
    newCustomers,
    packRevenue: packs30._sum.priceXof ?? 0,
    packsSold: packs30._count._all,
    recent,
    lowStock,
    designs,
    // counters summed over the 30 days (unknown or bad values ignored)
    funnel: metricRows.reduce<Record<string, number>>((sum, r) => {
      for (const [k, v] of Object.entries((r.value ?? {}) as Record<string, unknown>)) if (typeof v === "number") sum[k] = (sum[k] ?? 0) + v;
      return sum;
    }, {}),
  };
}

// ---------- Products & stock ----------

export async function getCatalogue() {
  const [products, stock, sold] = await Promise.all([
    db.product.findMany({ orderBy: { createdAt: "asc" } }),
    db.colorStock.findMany(),
    // Small shop: summing in JS is fine. Move to a SQL view once orders grow.
    db.orderItem.findMany({ where: { order: PAID }, select: { productId: true, savedDesignId: true, quantity: true, unitPriceXof: true } }),
  ]);

  const sales = new Map<string, { units: number; revenue: number }>();
  let studio = { units: 0, revenue: 0 };
  for (const it of sold) {
    const add = (s: { units: number; revenue: number }) => ({ units: s.units + it.quantity, revenue: s.revenue + it.quantity * it.unitPriceXof });
    if (it.productId) sales.set(it.productId, add(sales.get(it.productId) ?? { units: 0, revenue: 0 }));
    else studio = add(studio);
  }

  // One row per blank colour, in the shop's colour order; colours not in TEE_COLORS go last.
  const order = (hex: string) => {
    const i = TEE_COLORS.findIndex((c) => c.hex.toLowerCase() === hex.toLowerCase());
    return i === -1 ? TEE_COLORS.length : i;
  };
  const colours = new Map<string, { hex: string; name: string; sizes: typeof stock }>();
  for (const s of stock) {
    const key = s.colorHex.toLowerCase();
    if (!colours.has(key)) colours.set(key, { hex: s.colorHex, name: s.colorName, sizes: [] });
    colours.get(key)!.sizes.push(s);
  }
  const lowHex = new Set(stock.filter((s) => s.quantity <= s.lowAt).map((s) => s.colorHex.toLowerCase()));

  return {
    products: products.map((p) => ({ ...p, sales: sales.get(p.id) ?? { units: 0, revenue: 0 } })),
    studio,
    colours: [...colours.values()].sort((a, b) => order(a.hex) - order(b.hex)),
    lowHex,
    lowCount: stock.filter((s) => s.quantity <= s.lowAt).length,
    units: stock.reduce((n, s) => n + s.quantity, 0),
  };
}

// ---------- Customers ----------

export async function getCustomers(q?: string) {
  const search = q?.trim();
  const where: Prisma.CustomerWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
          { city: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};
  const [customers, balances] = await Promise.all([
    db.customer.findMany({
      where,
      include: {
        orders: { select: { totalXof: true, paymentStatus: true, createdAt: true }, orderBy: { createdAt: "desc" } },
        _count: { select: { designs: true } },
      },
    }),
    db.creditEntry.groupBy({ by: ["customerId"], _sum: { amount: true } }),
  ]);
  const balance = new Map(balances.map((b) => [b.customerId, b._sum.amount ?? 0]));
  const rows = customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    city: c.city,
    createdAt: c.createdAt,
    orders: c.orders.length,
    spent: c.orders.filter((o) => o.paymentStatus === "PAID").reduce((s, o) => s + o.totalXof, 0),
    lastOrder: c.orders[0]?.createdAt ?? null,
    credits: balance.get(c.id) ?? 0,
    designs: c._count.designs,
  }));
  rows.sort((a, b) => b.spent - a.spent || b.orders - a.orders || a.name.localeCompare(b.name, "fr"));
  const guestOrders = await db.order.count({ where: { customerId: null } });
  return { customers: rows, guestOrders };
}

// ---------- Studio: credits and saved designs ----------

export async function getStudio() {
  const [inCirculation, used30, packs, usage, ledger, designs, designCount, creations, creationCount] = await Promise.all([
    db.creditEntry.aggregate({ _sum: { amount: true } }),
    db.creditEntry.aggregate({ where: { amount: { lt: 0 }, createdAt: { gte: since(30) } }, _sum: { amount: true } }),
    db.creditEntry.groupBy({ by: ["pack"], where: { reason: "PURCHASE" }, _count: { _all: true }, _sum: { priceXof: true, amount: true } }),
    db.creditEntry.groupBy({ by: ["reason"], where: { amount: { lt: 0 }, createdAt: { gte: since(30) } }, _sum: { amount: true } }),
    db.creditEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { customer: { select: { name: true } }, design: { select: { name: true } } },
    }),
    // The latest saved creations, grouped below into one card per customer.
    db.savedDesign.findMany({
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: {
        id: true,
        name: true,
        teeColor: true,
        previewUrl: true,
        updatedAt: true,
        customer: { select: { id: true, name: true, email: true, phone: true } },
        orderItems: { select: { quantity: true } },
      },
    }),
    db.savedDesign.count(),
    // T-shirts created in the studio and ordered (an order line with no catalogue product), newest first.
    db.orderItem.findMany({
      where: { productId: null },
      orderBy: { order: { createdAt: "desc" } },
      take: 24,
      include: {
        order: { select: { reference: true, customerName: true, createdAt: true, status: true } },
        customDesigns: { orderBy: { layer: "asc" }, select: { fileUrl: true, layer: true, placement: true } },
      },
    }),
    db.orderItem.count({ where: { productId: null } }),
  ]);
  return {
    inCirculation: inCirculation._sum.amount ?? 0,
    used30: -(used30._sum.amount ?? 0),
    packs: packs.filter((p) => p.pack).map((p) => ({ pack: p.pack!, sold: p._count._all, revenue: p._sum.priceXof ?? 0, credits: p._sum.amount ?? 0 })),
    usage: usage.map((u) => ({ reason: u.reason, credits: -(u._sum.amount ?? 0) })).sort((a, b) => b.credits - a.credits),
    ledger,
    // One entry per customer, the one who saved most recently first (Map keeps the order of first sight).
    designers: [
      ...designs
        .reduce((by, { customer, orderItems, ...d }) => {
          const card = by.get(customer.id) ?? { ...customer, designs: [] as (typeof d & { colorName: string; ordered: number })[] };
          card.designs.push({ ...d, colorName: colorName(d.teeColor), ordered: orderItems.reduce((n, i) => n + i.quantity, 0) });
          return by.set(customer.id, card);
        }, new Map<string, (typeof designs)[number]["customer"] & { designs: (Omit<(typeof designs)[number], "customer" | "orderItems"> & { colorName: string; ordered: number })[] }>())
        .values(),
    ],
    designCount,
    creations: creations.map((c) => ({ ...c, colorName: colorName(c.color) })),
    creationCount,
  };
}

// ---------- Credit purchases (/credits) ----------

export async function getCreditPurchases({ paid, q }: { paid?: boolean; q?: string }) {
  const search = q?.trim();
  const where: Prisma.CreditPurchaseWhereInput = {
    ...(paid !== undefined && { paymentStatus: paid ? "PAID" : "UNPAID" }),
    ...(search && {
      OR: [
        { reference: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search } },
        { paymentRef: { contains: search, mode: "insensitive" } },
      ],
    }),
  };
  const [purchases, counts] = await Promise.all([
    // Waiting for payment first (Postgres sorts an enum in declaration order: UNPAID, PAID, …), newest first within each.
    db.creditPurchase.findMany({ where, orderBy: [{ paymentStatus: "asc" }, { createdAt: "desc" }], take: 200 }),
    db.creditPurchase.groupBy({ by: ["paymentStatus"], _count: { _all: true }, _sum: { priceXof: true } }),
  ]);
  const of = (s: "PAID" | "UNPAID") => counts.find((c) => c.paymentStatus === s);
  return {
    purchases,
    unpaid: { count: of("UNPAID")?._count._all ?? 0, value: of("UNPAID")?._sum.priceXof ?? 0 },
    paid: { count: of("PAID")?._count._all ?? 0, value: of("PAID")?._sum.priceXof ?? 0 },
  };
}

// ---------- Sales ----------

export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];

export async function getSales(days: Period) {
  // Whole days in Abidjan time (UTC+0, no daylight saving), today included; per week over 90 days.
  const step = days === 90 ? 7 : 1;
  const count = Math.ceil(days / step);
  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);
  const buckets = Array.from({ length: count }, (_, i) => ({ start: new Date(end.getTime() + 1 - (count - i) * step * DAY), value: 0, orders: 0 }));
  const from = buckets[0].start;
  const before = new Date(from.getTime() - count * step * DAY);

  const [orders, previous, packs] = await Promise.all([
    db.order.findMany({
      where: { ...PAID, createdAt: { gte: from } },
      select: {
        createdAt: true,
        totalXof: true,
        deliveryXof: true,
        paymentMethod: true,
        delivery: true,
        items: { select: { quantity: true, unitPriceXof: true, productId: true, product: { select: { name: true, art: true, colors: true } } } },
      },
    }),
    db.order.aggregate({ where: { ...PAID, createdAt: { gte: before, lt: from } }, _sum: { totalXof: true }, _count: { _all: true } }),
    db.creditEntry.aggregate({ where: { reason: "PURCHASE", createdAt: { gte: from } }, _sum: { priceXof: true }, _count: { _all: true } }),
  ]);

  const products = new Map<string, { name: string; art: string | null; color: string; units: number; revenue: number }>();
  const methods = new Map<string, number>();
  const delivery = new Map<string, number>();
  let units = 0;

  for (const o of orders) {
    const b = buckets.findLast((x) => x.start <= o.createdAt);
    if (b) {
      b.value += o.totalXof;
      b.orders += 1;
    }
    methods.set(o.paymentMethod ?? "—", (methods.get(o.paymentMethod ?? "—") ?? 0) + o.totalXof);
    delivery.set(o.delivery, (delivery.get(o.delivery) ?? 0) + 1);
    for (const it of o.items) {
      units += it.quantity;
      const key = it.productId ?? "studio";
      const cur = products.get(key) ?? { name: it.product?.name ?? "Créations personnalisées", art: it.product?.art ?? null, color: it.product?.colors[0] ?? "#1C1C1E", units: 0, revenue: 0 };
      products.set(key, { ...cur, units: cur.units + it.quantity, revenue: cur.revenue + it.quantity * it.unitPriceXof });
    }
  }

  const revenue = orders.reduce((s, o) => s + o.totalXof, 0);
  return {
    days,
    step,
    revenue,
    revenueDelta: pct(revenue, previous._sum.totalXof ?? 0),
    orders: orders.length,
    ordersDelta: pct(orders.length, previous._count._all),
    average: orders.length ? Math.round(revenue / orders.length) : 0,
    units,
    deliveryFees: orders.reduce((s, o) => s + o.deliveryXof, 0),
    packRevenue: packs._sum.priceXof ?? 0,
    packsSold: packs._count._all,
    buckets,
    products: [...products.values()].sort((a, b) => b.revenue - a.revenue),
    methods: [...methods.entries()].map(([method, value]) => ({ method, value })).sort((a, b) => b.value - a.value),
    delivery: [...delivery.entries()].map(([method, count]) => ({ method, count })).sort((a, b) => b.count - a.count),
  };
}
