/*
 * Fills the database with sample rows so the admin pages are not empty.
 * Run with: pnpm db:seed (after pnpm db:deploy).
 *
 * Every sample row has an id starting with "seed_". Running the seed again deletes
 * and recreates those rows only; rows written by the shop are never touched.
 * Dates are relative to the moment the seed runs, so the last 30 days always have sales.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import {
  CreditPack,
  CreditReason,
  DeliveryMethod,
  OrderStatus,
  PaymentStatus,
  Prisma,
  PrismaClient,
  ProductTag,
  Size,
} from "../src/generated/prisma/client";
import { TEE_COLORS } from "../src/lib/data";
import { PRODUCTS } from "../src/lib/products";

try {
  process.loadEnvFile(".env");
} catch {}

// Same as pgUrl in src/server/db.ts: pg treats sslmode=require as verify-full; say it so it does not warn.
const url = process.env.DATABASE_URL?.replace(/sslmode=(prefer|require|verify-ca)/, "sslmode=verify-full");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

// Seeded pseudo-random numbers (mulberry32): the same sample shop on every run.
let state = 2611;
function rand() {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
const chance = (p: number) => rand() < p;

const NOW = Date.now();
const DAY = 86_400_000;
/** A moment `days` days ago, during opening hours, never in the future. */
function daysAgo(days: number) {
  const d = new Date(NOW - days * DAY);
  d.setHours(int(8, 21), int(0, 59), int(0, 59), 0);
  return new Date(Math.min(d.getTime(), NOW - int(10, 120) * 60_000));
}
const later = (from: Date, minDays: number, maxDays: number) => new Date(Math.min(from.getTime() + (minDays + rand() * (maxDays - minDays)) * DAY, NOW - 30 * 60_000));

// ---------- Catalogue: the shop's own products and blank colours ----------

const SIZES = [Size.S, Size.M, Size.L, Size.XL, Size.XXL];
const TAGS = { Nouveau: ProductTag.NOUVEAU, "Best-seller": ProductTag.BEST_SELLER, Promo: ProductTag.PROMO } as const;
const slug = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const products: Prisma.ProductCreateManyInput[] = PRODUCTS.map((p) => ({
  id: `seed_product_${p.id}`,
  slug: slug(p.name),
  name: p.name,
  priceXof: p.price,
  oldPriceXof: p.oldPrice ?? null,
  tag: p.tag ? TAGS[p.tag] : null,
  art: p.art,
  colors: p.colors,
  sizes: SIZES,
  createdAt: daysAgo(120 - p.id * 6),
}));

// M and L sell most; a few colours run low on purpose so the alerts show.
const BASE = { S: 14, M: 30, L: 34, XL: 20, XXL: 9 } as Record<Size, number>;
const SCARCE: Record<string, number> = { Rouge: 0.25, Rose: 0.35, Kaki: 0.5 };
const stock: Prisma.ColorStockCreateManyInput[] = TEE_COLORS.flatMap((c) =>
  SIZES.map((size) => ({
    id: `seed_stock_${slug(c.name)}_${size}`,
    colorHex: c.hex,
    colorName: c.name,
    size,
    quantity: Math.max(0, Math.round(BASE[size] * (SCARCE[c.name] ?? 1) * (0.55 + rand() * 0.8)) - (chance(0.08) ? 40 : 0)),
    lowAt: 5,
  })),
);

// ---------- Customers ----------

const PEOPLE: [string, string, string, string | null][] = [
  ["Awa Koné", "Abidjan", "Cocody, Riviera 3", "awa.kone@example.com"],
  ["Yao Kouassi", "Abidjan", "Yopougon, Niangon Sud", null],
  ["Aminata Traoré", "Grand-Bassam", "Quartier France", "aminata.t@example.com"],
  ["Koffi N'Guessan", "Abidjan", "Marcory, Zone 4", "koffi.ng@example.com"],
  ["Fatou Diabaté", "Bouaké", "Quartier Commerce", null],
  ["Serge Kouamé", "Abidjan", "Plateau, avenue Chardy", "serge.kouame@example.com"],
  ["Mariam Ouattara", "Yamoussoukro", "Habitat", "mariam.o@example.com"],
  ["Jean-Marc Aka", "Abidjan", "Cocody, Angré 8e tranche", null],
  ["Salimata Bamba", "Abidjan", "Treichville, avenue 12", "sali.bamba@example.com"],
  ["Didier Yapi", "San-Pédro", "Quartier Bardot", null],
  ["Grâce Ahoua", "Abidjan", "Cocody, II Plateaux", "grace.ahoua@example.com"],
  ["Ibrahim Cissé", "Abidjan", "Adjamé, 220 Logements", null],
  ["Christelle Brou", "Grand-Bassam", "Mockeyville", "christelle.brou@example.com"],
  ["Moussa Sangaré", "Abidjan", "Koumassi, Remblais", "moussa.s@example.com"],
];
const GUESTS: [string, string, string][] = [
  ["Esther Kacou", "Abidjan", "Bingerville, Cité Feh Kessé"],
  ["Hervé Gnagne", "Abidjan", "Port-Bouët, Vridi"],
  ["Nadia Touré", "Bouaké", "Air France 2"],
  ["Paul Kodjo", "Abidjan", "Abobo, Avocatier"],
  ["Rokia Fofana", "Daloa", "Lobia"],
];
const phone = () => `+225 07 ${int(10, 99)} ${int(10, 99)} ${int(10, 99)} ${int(10, 99)}`;

const customers: (Prisma.CustomerCreateManyInput & { id: string; createdAt: Date })[] = PEOPLE.map(([name, city, address, email], i) => ({
  id: `seed_customer_${i + 1}`,
  name,
  phone: phone(),
  email,
  city,
  address,
  createdAt: daysAgo(int(70, 140)),
}));

// ---------- Saved designs (studio) ----------

const DESIGN_NAMES = ["Bassam 225", "Lagune", "Équipe du samedi", "Wax soleil", "Maquis club", "Promo 2027", "Akwaba", "Nuit d'Abidjan", "Atelier", "Famille Aka", "Anniv' 30 ans", "Sous le fromager"];
const FONTS = ["serif", "italic", "sans"] as const;
const designs: (Prisma.SavedDesignCreateManyInput & { id: string; createdAt: Date })[] = [];
const withImage = new Set<string>(); // designs that used an uploaded image (1 extra credit)
customers.forEach((c, ci) => {
  if (ci % 3 === 2) return; // a third of the customers never save a design
  const n = int(1, ci === 0 ? 4 : 2);
  for (let k = 0; k < n; k++) {
    const name = DESIGN_NAMES[(ci * 2 + k) % DESIGN_NAMES.length];
    const hasImage = chance(0.5);
    const text = { value: name, font: pick(FONTS), color: pick(["#efe9df", "#1a1a1a", "#c8102e", "#d8c7a5"]), x: 0.5, y: 0.28, size: 0.14, rot: 0 };
    const image = { fileName: `${slug(name)}.png`, x: 0.5, y: 0.45, scale: 0.6, rot: 0 };
    designs.push({
      id: `seed_design_${ci + 1}_${k + 1}`,
      customerId: c.id,
      name,
      teeColor: pick(TEE_COLORS).hex,
      front: hasImage ? { text, image } : { text },
      back: chance(0.3) ? { text: { ...text, value: "ArtSyde", y: 0.2, size: 0.08 } } : Prisma.DbNull,
      createdAt: daysAgo(int(1, 65)), // customers signed up 70 days ago or more
    });
    if (hasImage) withImage.add(`seed_design_${ci + 1}_${k + 1}`);
  }
});

// ---------- Studio credits: the ledger ----------

const PACKS = { [CreditPack.DECOUVERTE]: { n: 20, price: 1000 }, [CreditPack.CREATEUR]: { n: 60, price: 2500 }, [CreditPack.STUDIO]: { n: 150, price: 5000 } };
const credits: Prisma.CreditEntryCreateManyInput[] = [];
customers.forEach((c, ci) => {
  const id = (k: string) => `seed_credit_${ci + 1}_${k}`;
  credits.push({ id: id("signup"), customerId: c.id, amount: 5, reason: CreditReason.SIGNUP_BONUS, createdAt: c.createdAt });

  const mine = designs.filter((d) => d.customerId === c.id);
  const uploads = mine.filter((d) => withImage.has(d.id)).length + int(0, 3);
  const previews = chance(0.4) ? int(1, 3) : 0;
  const spent = mine.length + uploads + previews;

  // Customers who spend more than the welcome credits bought a pack first.
  const pack = ci === 0 ? CreditPack.STUDIO : spent > 5 ? (spent > 20 ? CreditPack.CREATEUR : CreditPack.DECOUVERTE) : chance(0.2) ? CreditPack.DECOUVERTE : null;
  if (pack)
    credits.push({
      id: id("pack"),
      customerId: c.id,
      amount: PACKS[pack].n,
      reason: CreditReason.PURCHASE,
      pack,
      priceXof: PACKS[pack].price,
      paymentRef: `WV-${(ci + 1).toString().padStart(3, "0")}${int(100000, 999999)}`,
      createdAt: later(c.createdAt, 0.2, 0.9),
    });
  mine.forEach((d, k) => {
    credits.push({ id: id(`save${k}`), customerId: c.id, amount: -1, reason: CreditReason.DESIGN_SAVE, designId: d.id, createdAt: d.createdAt });
  });
  for (let k = 0; k < uploads; k++) credits.push({ id: id(`upload${k}`), customerId: c.id, amount: -1, reason: CreditReason.IMAGE_UPLOAD, createdAt: daysAgo(int(0, 45)) });
  for (let k = 0; k < previews; k++) credits.push({ id: id(`hd${k}`), customerId: c.id, amount: -1, reason: CreditReason.HD_PREVIEW, createdAt: daysAgo(int(0, 45)) });
  // A few customers topped up recently.
  if (ci % 4 === 1) {
    const top = ci % 8 === 1 ? CreditPack.CREATEUR : CreditPack.DECOUVERTE;
    credits.push({ id: id("topup"), customerId: c.id, amount: PACKS[top].n, reason: CreditReason.PURCHASE, pack: top, priceXof: PACKS[top].price, paymentRef: `OM-${(ci + 1).toString().padStart(3, "0")}${int(100000, 999999)}`, createdAt: daysAgo(int(1, 25)) });
  }
  if (ci === 4) credits.push({ id: id("gift"), customerId: c.id, amount: 3, reason: CreditReason.ADJUSTMENT, createdAt: later(c.createdAt, 10, 20) });
});

// ---------- Orders ----------

const FEES = { [DeliveryMethod.STANDARD]: 1500, [DeliveryMethod.EXPRESS]: 3000, [DeliveryMethod.RETRAIT]: 0 };
const METHODS = ["WAVE", "WAVE", "WAVE", "ORANGE_MONEY", "ORANGE_MONEY", "MTN", "MOOV", "CARD"];
const STUDIO_PRICE = 8000;
const BACK_PRICE = 2000;

const ages = Array.from({ length: 42 }, () => Math.floor(Math.pow(rand(), 1.25) * 62)).sort((a, b) => b - a);
const orders: Prisma.OrderCreateManyInput[] = [];
const items: Prisma.OrderItemCreateManyInput[] = [];

ages.forEach((age, i) => {
  const createdAt = daysAgo(age);
  const customer = chance(0.75) ? pick(customers) : null;
  const guest = pick(GUESTS);
  const delivery = pick([DeliveryMethod.STANDARD, DeliveryMethod.STANDARD, DeliveryMethod.STANDARD, DeliveryMethod.EXPRESS, DeliveryMethod.RETRAIT]);
  const orderId = `seed_order_${i + 1}`;

  const count = pick([1, 1, 1, 2, 2, 3]);
  let subtotal = 0;
  let hasStudio = false;
  for (let k = 0; k < count; k++) {
    const own = customer ? designs.filter((d) => d.customerId === customer.id && d.createdAt < createdAt) : [];
    const size = pick([Size.S, Size.M, Size.M, Size.L, Size.L, Size.XL, Size.XXL]);
    const quantity = chance(0.2) ? int(2, 4) : 1;
    if (own.length && chance(0.45)) {
      const d = pick(own);
      const unit = STUDIO_PRICE + (d.back === Prisma.DbNull ? 0 : BACK_PRICE);
      items.push({ id: `seed_item_${i + 1}_${k + 1}`, orderId, savedDesignId: d.id, size, color: d.teeColor, quantity, unitPriceXof: unit });
      subtotal += unit * quantity;
      hasStudio = true;
    } else {
      const p = pick(PRODUCTS);
      items.push({ id: `seed_item_${i + 1}_${k + 1}`, orderId, productId: `seed_product_${p.id}`, size, color: pick(p.colors), quantity, unitPriceXof: p.price });
      subtotal += p.price * quantity;
    }
  }

  // The older the order, the further along it is.
  let status: OrderStatus;
  if (age > 14) status = chance(0.1) ? OrderStatus.CANCELLED : OrderStatus.DELIVERED;
  else if (age > 6) status = delivery === DeliveryMethod.RETRAIT || chance(0.4) ? OrderStatus.DELIVERED : OrderStatus.SHIPPED;
  else if (age > 2) status = hasStudio && chance(0.6) ? OrderStatus.IN_DESIGN : pick([OrderStatus.IN_PRODUCTION, OrderStatus.IN_PRODUCTION, OrderStatus.SHIPPED]);
  else status = pick([OrderStatus.PENDING_PAYMENT, OrderStatus.PAID, OrderStatus.PAID, hasStudio ? OrderStatus.IN_DESIGN : OrderStatus.PAID]);

  const paid = status !== OrderStatus.PENDING_PAYMENT && !(status === OrderStatus.CANCELLED && chance(0.5));
  const paymentStatus = paid ? (status === OrderStatus.CANCELLED ? PaymentStatus.REFUNDED : PaymentStatus.PAID) : chance(0.3) ? PaymentStatus.FAILED : PaymentStatus.UNPAID;
  const method = pick(METHODS);

  orders.push({
    id: orderId,
    reference: "", // numbered below, in date order
    status,
    customerId: customer?.id ?? null,
    customerName: customer?.name ?? guest[0],
    customerPhone: customer?.phone ?? phone(),
    customerEmail: customer?.email ?? null,
    city: customer?.city ?? guest[1],
    address: customer?.address ?? guest[2],
    deliveryNotes: chance(0.15) ? pick(["Appeler avant de passer.", "Livrer après 17 h.", "Portail bleu, à côté de la pharmacie."]) : null,
    delivery,
    subtotalXof: subtotal,
    deliveryXof: FEES[delivery],
    totalXof: subtotal + FEES[delivery],
    paymentStatus,
    paymentMethod: paymentStatus === PaymentStatus.UNPAID ? null : method,
    paymentRef: paymentStatus === PaymentStatus.PAID || paymentStatus === PaymentStatus.REFUNDED ? `${method.slice(0, 2)}-${int(10000000, 99999999)}` : null,
    createdAt,
  });
});

// References follow the dates ("AS-2611-0142": year, month, running number), and the newest
// order is still waiting for its payment so that state shows too.
orders.sort((a, b) => +(a.createdAt as Date) - +(b.createdAt as Date));
orders.forEach((o, i) => {
  const d = o.createdAt as Date;
  o.reference = `AS-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}-${String(i + 101).padStart(4, "0")}`;
});
Object.assign(orders[orders.length - 1], { status: OrderStatus.PENDING_PAYMENT, paymentStatus: PaymentStatus.UNPAID, paymentMethod: null, paymentRef: null });

// ---------- Write ----------

async function main() {
  const seeded = { id: { startsWith: "seed_" } };
  await db.$transaction([
    db.creditEntry.deleteMany({ where: seeded }),
    db.order.deleteMany({ where: seeded }), // order items go with their order
    db.savedDesign.deleteMany({ where: seeded }),
    db.customer.deleteMany({ where: seeded }),
    db.colorStock.deleteMany({ where: seeded }),
    db.product.deleteMany({ where: seeded }),

    db.product.createMany({ data: products }),
    db.colorStock.createMany({ data: stock }),
    db.customer.createMany({ data: customers }),
    db.savedDesign.createMany({ data: designs }),
    db.creditEntry.createMany({ data: credits }),
    db.order.createMany({ data: orders }),
    db.orderItem.createMany({ data: items }),
  ]);
  console.log(
    `Sample data: ${products.length} products, ${stock.length} stock lines, ${customers.length} customers, ${designs.length} saved designs, ${credits.length} credit entries, ${orders.length} orders.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
