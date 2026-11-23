import type { MetadataRoute } from "next";
import { getCatalog } from "@/server/catalog";
import { productHref } from "@/lib/products";
import { SITE_URL } from "@/lib/site";
import { localizeHref } from "@/lib/i18n";

/** Each page in French (its plain URL) and in English (/en…), each listing the other as its translation. */
const both = (path: string) => {
  const fr = `${SITE_URL}${path}`;
  const en = `${SITE_URL}${localizeHref("en", path || "/")}`;
  const alternates = { languages: { fr, en, "x-default": fr } };
  return [{ url: fr, alternates }, { url: en, alternates }];
};

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
    ...PAGES.flatMap((p) => both(p.path).map((u) => ({ ...u, changeFrequency: p.changeFrequency, priority: p.priority }))),
    ...products.flatMap((p) =>
      both(productHref(p)).map((u) => ({ ...u, changeFrequency: "weekly" as const, priority: 0.8, images: p.photo ? [p.photo] : undefined })),
    ),
  ];
}
