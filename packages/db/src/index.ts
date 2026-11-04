import { PrismaClient } from "@prisma/client";

/*
 * Une seule instance de PrismaClient par processus. En développement,
 * Next.js recharge les modules à chaque modification : sans ce cache
 * global, chaque rechargement ouvrirait de nouvelles connexions à Neon.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";
