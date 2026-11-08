import type { MetadataRoute } from "next";
import { getCatalog } from "@/server/catalog";
import { productHref } from "@/lib/products";
import { SITE_URL } from "@/lib/site";

const PAGES: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" | "yearly" }[] = [
  { path: "", priority: 1, changeFrequency: "daily" },
  { path: "/studio", priority: 0.9, changeFrequency: "weekly" },
  { path: "/atelier", priority: 0.7, changeFrequency: "monthly" },
  { path: "/credits", priority: 0.6, changeFrequency: "monthly" },
  { path: "/guide-des-tailles", priority: 0.5, changeFrequency: "yearly" },
  { path: "/livraison", priority: 0.5, changeFrequency: "yearly" },
  { path: "/contact", priority: 0.5, changeFrequency: "yearly" },
  { path: "/conditions-de-vente", priority: 0.2, changeFrequency: "yearly" },
  { path: "/conditions-d-utilisation", priority: 0.2, changeFrequency: "yearly" },
  { path: "/mentions-legales", priority: 0.2, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getCatalog();
  return [
    ...PAGES.map((p) => ({ url: `${SITE_URL}${p.path}`, changeFrequency: p.changeFrequency, priority: p.priority })),
    ...products.map((p) => ({
      url: `${SITE_URL}${productHref(p)}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: p.photo ? [p.photo] : undefined,
    })),
  ];
}
