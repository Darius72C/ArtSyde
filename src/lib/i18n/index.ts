import { EN } from "./en";

/*
 * The site in French (the original, at /) and English (at /en). Texts are written in French in the code
 * and wrapped in t(): in English, t() looks the French text up in ./en.ts; in French it returns it as is.
 * "{name}" placeholders are filled from `vars`. A text missing from en.ts shows in French (see
 * scripts/i18n-check.mjs, which lists them).
 */

export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";

export const isLocale = (v: unknown): v is Locale => v === "fr" || v === "en";

export type Vars = Record<string, string | number>;

const fill = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s);

export function translate(locale: Locale, fr: string, vars?: Vars): string {
  return fill(locale === "en" ? (EN[fr] ?? fr) : fr, vars);
}

export type T = (fr: string, vars?: Vars) => string;
export const makeT = (locale: Locale): T => (fr, vars) => translate(locale, fr, vars);

/** French or English, picked inline: for a long text or one with markup, where a dictionary key would be awkward. */
export const pick = <V>(locale: Locale, fr: V, en: V): V => (locale === "en" ? en : fr);

/** Paths that are never under /en (the admin, the API, files). */
const UNLOCALIZED = /^\/(admin|api|_next|connexion\/admin)(\/|$)|\.[a-z0-9]+$/i;

/** A site path in `locale`: /boutique/x → /en/boutique/x in English. Leaves full URLs, anchors and the admin alone. */
export function localizeHref(locale: Locale, href: string): string {
  if (locale !== "en" || !href.startsWith("/") || href.startsWith("//") || UNLOCALIZED.test(href.split(/[?#]/)[0])) return href;
  if (href === "/en" || href.startsWith("/en/") || href.startsWith("/en?") || href.startsWith("/en#")) return href;
  return href === "/" ? "/en" : href.startsWith("/?") || href.startsWith("/#") ? `/en${href.slice(1)}` : `/en${href}`;
}

/** The same page in the other language (for the language switch). */
export function switchLocaleHref(path: string, to: Locale): string {
  const bare = path === "/en" ? "/" : path.startsWith("/en/") ? path.slice(3) : path;
  return localizeHref(to, bare);
}

/** Locale of a URL path (/en/... → en). */
export const localeOfPath = (path: string): Locale => (path === "/en" || path.startsWith("/en/") ? "en" : "fr");

/** BCP 47 tag for dates and numbers. */
export const intlLocale = (locale: Locale) => (locale === "en" ? "en-GB" : "fr-FR");

/** Metadata `alternates` for a page: its URL in this language (canonical) and in both (hreflang). */
export function languageAlternates(locale: Locale, path: string) {
  const fr = path || "/";
  return { canonical: localizeHref(locale, fr), languages: { fr, en: localizeHref("en", fr), "x-default": fr } };
}
