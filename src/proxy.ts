import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, ADMIN_SIGN_IN, verifyAdminToken } from "@/server/admin/token";

/*
 * First gate in front of /admin: no valid admin cookie → the sign-in page, with the
 * page asked for kept in `?de=`. Every admin read checks the session again on the
 * server (requireAdmin in src/server/admin/auth.ts), so this is not the only lock.
 */
export async function proxy(request: NextRequest) {
  const ok = await verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value, process.env.ADMIN_PASSWORD);
  if (ok) return NextResponse.next();
  const url = new URL(ADMIN_SIGN_IN, request.url);
  url.searchParams.set("de", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
