import "server-only";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LANG_COOKIE, isLocale, localeOfPath, makeT, type Locale } from ".";

/**
 * The visitor's language in a Server Action or a Route Handler (no route segment there): the header the
 * proxy sets on site pages, else the page of this site the request came from, else the proxy's cookie.
 */
export async function getRequestLocale(): Promise<Locale> {
  const h = await headers();
  const x = h.get("x-locale");
  if (isLocale(x)) return x;
  const ref = h.get("referer");
  if (ref) {
    try {
      const u = new URL(ref);
      if (u.host === h.get("host")) return localeOfPath(u.pathname);
    } catch {}
  }
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  return isLocale(c) ? c : DEFAULT_LOCALE;
}

export const getRequestT = async () => makeT(await getRequestLocale());
