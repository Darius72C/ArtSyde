"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, localizeHref, makeT, type Locale } from "@/lib/i18n";

const Ctx = createContext<Locale>(DEFAULT_LOCALE);

/** Gives the page's language to the Client Components below it (set by the [lang] root layout). */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}

export const useLocale = () => useContext(Ctx);

/** t() for the page's language, in a Client Component. */
export function useT() {
  const locale = useContext(Ctx);
  return useMemo(() => makeT(locale), [locale]);
}

/** Site paths in the page's language: href("/panier") is /en/panier on the English site. */
export function useHref() {
  const locale = useContext(Ctx);
  return useMemo(() => (path: string) => localizeHref(locale, path), [locale]);
}
