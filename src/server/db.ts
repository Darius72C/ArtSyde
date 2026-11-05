import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/*
 * One PrismaClient per process. In development Next.js reloads modules on every
 * edit: without this global cache, each reload would open new connections to Neon.
 * The app uses the pooled DATABASE_URL; migrations use DIRECT_URL (prisma.config.ts).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaClass?: unknown };

/** Neon URLs say `sslmode=require`, which pg already treats as `verify-full` (and warns about). Say it explicitly. */
export const pgUrl = (url = process.env.DATABASE_URL) => url?.replace(/\bsslmode=(prefer|require|verify-ca)\b/, "sslmode=verify-full");

function createClient() {
  const adapter = new PrismaPg({ connectionString: pgUrl() });
  return new PrismaClient({ adapter, log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });
}

// The cached client is reused only if it comes from the current generated client: after `prisma generate`
// (a new table), a reload gets a client that knows it, instead of one where the new table is missing.
const cached = globalForPrisma.prismaClass === PrismaClient ? globalForPrisma.prisma : undefined;
if (!cached && globalForPrisma.prisma) void globalForPrisma.prisma.$disconnect().catch(() => {});

export const db = cached ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
  globalForPrisma.prismaClass = PrismaClient;
}
