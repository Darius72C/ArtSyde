import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ADMIN_COOKIE, ADMIN_SIGN_IN, verifyAdminToken } from "./token";

/** True when this request carries a valid admin session. */
export async function isAdmin() {
  // The expiry check reads the clock: request time only.
  await connection();
  return verifyAdminToken((await cookies()).get(ADMIN_COOKIE)?.value, process.env.ADMIN_PASSWORD);
}

/** Called before every admin read (see `load` in queries.ts): signed out → the sign-in page. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect(ADMIN_SIGN_IN);
}
