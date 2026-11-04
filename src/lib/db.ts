import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/*
 * One PrismaClient per process. In development Next.js reloads modules on every
 * edit: without this global cache, each reload would open new connections to Neon.
 * The app uses the pooled DATABASE_URL; migrations use DIRECT_URL (prisma.config.ts).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Neon URLs say `sslmode=require`, which pg already treats as `verify-full` (and warns about). Say it explicitly. */
export const pgUrl = (url = process.env.DATABASE_URL) => url?.replace(/\bsslmode=(prefer|require|verify-ca)\b/, "sslmode=verify-full");

function createClient() {
  const adapter = new PrismaPg({ connectionString: pgUrl() });
  return new PrismaClient({ adapter, log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
