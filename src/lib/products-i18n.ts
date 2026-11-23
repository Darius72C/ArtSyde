import type { Locale } from "./i18n";
import type { Product } from "./products";

/** A product as the page in `locale` shows it: the English description on /en when one is written, else the French. */
export function localized<P extends Pick<Product, "description" | "descriptionEn">>(p: P, locale: Locale): P {
  return locale === "en" && p.descriptionEn?.trim() ? { ...p, description: p.descriptionEn } : p;
}
