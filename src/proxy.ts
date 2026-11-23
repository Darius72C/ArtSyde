import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, ADMIN_SIGN_IN, verifyAdminToken } from "@/server/admin/token";
import { LANG_COOKIE } from "@/lib/i18n/cookie";

/*
 * 1. /admin: no valid admin cookie → the sign-in page, with the page asked for kept in `?de=`. Every admin
 *    read checks the session again on the server (requireAdmin in src/server/admin/auth.ts), so this is
 *    not the only lock.
 * 2. The site's two languages (src/app/[lang]): French keeps its plain URLs (/boutique/x is served by
 *    /fr/boutique/x, rewritten here), English lives under /en. /fr/... is sent back to the plain URL.
 *    Every site request carries `x-locale`, which Server Actions read for their messages (getRequestLocale).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const ok = await verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value, process.env.ADMIN_PASSWORD);
    if (ok) return NextResponse.next();
    const url = new URL(ADMIN_SIGN_IN, request.url);
    url.searchParams.set("de", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (pathname === "/fr" || pathname.startsWith("/fr/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }

  const english = pathname === "/en" || pathname.startsWith("/en/");
  const locale = english ? "en" : "fr";
  const headers = new Headers(request.headers);
  headers.set("x-locale", locale);
  let res: NextResponse;
  if (english) res = NextResponse.next({ request: { headers } });
  else {
    const url = request.nextUrl.clone();
    url.pathname = `/fr${pathname === "/" ? "" : pathname}`;
    res = NextResponse.rewrite(url, { request: { headers } });
  }
  // The visitor's language, for what happens outside the pages (sign-in e-mails sent from /api/auth). Set only
  // when it changes, so ordinary page views carry no Set-Cookie.
  if (request.cookies.get(LANG_COOKIE)?.value !== locale) res.cookies.set(LANG_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}

export const config = {
  // Everything but the API, Next's own files and static files (a dot in the last segment: /icons/x.png, /sw.js, /robots.txt…).
  matcher: ["/((?!api/|_next/|.*\\.[a-zA-Z0-9]+$).*)"],
};
