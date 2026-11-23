import "server-only";

// Server Components only (next/root-params). Server Actions and Route Handlers: ./request.ts.
import type { Metadata } from "next";
import { lang } from "next/root-params";
import { DEFAULT_LOCALE, isLocale, languageAlternates, makeT, type Locale } from ".";

/** The page's language, in a Server Component (from the /[lang] segment). */
export async function getLocale(): Promise<Locale> {
  const l = await lang();
  return isLocale(l) ? l : DEFAULT_LOCALE;
}

/** t() for the page's language, in a Server Component. */
export const getT = async () => makeT(await getLocale());



/**
 * A page's metadata in its language: `export const generateMetadata = pageMetadata("Mon panier — ArtSyde", "/panier")`.
 * Title and description are French texts looked up like t(); `path` (the French URL) adds canonical and hreflang.
 */
export const pageMetadata =
  (title: string, path?: string, description?: string, extra: Metadata = {}) =>
  async (): Promise<Metadata> => {
    const locale = await getLocale();
    const t = makeT(locale);
    return { title: t(title), ...(description ? { description: t(description) } : {}), ...(path !== undefined ? { alternates: languageAlternates(locale, path) } : {}), ...extra };
  };
