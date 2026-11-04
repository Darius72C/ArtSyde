import { prisma } from "@artsyde/db";

// Accès aux produits pour les pages serveur. Seuls les produits actifs sont visibles.

const cardFields = {
  id: true,
  slug: true,
  name: true,
  priceXof: true,
  designUrl: true,
  mockups: true,
  colors: true,
} as const;

export function getProducts() {
  return prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    select: cardFields,
  });
}

export function getLatestProducts(take = 4) {
  return prisma.product.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    take,
    select: cardFields,
  });
}

export function getProductBySlug(slug: string) {
  return prisma.product.findFirst({ where: { slug, active: true } });
}

export type ProductCardData = Awaited<ReturnType<typeof getProducts>>[number];
