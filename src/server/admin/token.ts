/*
 * The admin session token, signed with ADMIN_PASSWORD (HMAC-SHA256, Web Crypto).
 * Plain module, no `server-only`: proxy.ts imports it as well as the server code.
 * Changing ADMIN_PASSWORD signs everyone out, since old tokens no longer verify.
 */

export const ADMIN_COOKIE = "artsyde_admin";
export const ADMIN_MAX_AGE = 7 * 24 * 60 * 60; // seconds
/** Where the admin sign-in lives (outside /admin, so proxy.ts never sends it to itself). */
export const ADMIN_SIGN_IN = "/connexion/admin";

const enc = new TextEncoder();

const b64url = (bytes: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

function fromB64url(s: string): Uint8Array<ArrayBuffer> | null {
  try {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

function key(secret: string) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

/** A token valid for ADMIN_MAX_AGE: "<expiry ms>.<signature>". */
export async function signAdminToken(secret: string, now = Date.now()) {
  const exp = String(now + ADMIN_MAX_AGE * 1000);
  const sig = await crypto.subtle.sign("HMAC", await key(secret), enc.encode(`admin:${exp}`));
  return `${exp}.${b64url(sig)}`;
}

/** True when the token was signed with this secret and has not expired. Fails closed without a secret. */
export async function verifyAdminToken(token: string | undefined, secret: string | undefined, now = Date.now()) {
  if (!token || !secret) return false;
  const [exp, sig] = token.split(".");
  const bytes = sig ? fromB64url(sig) : null;
  if (!exp || !/^\d+$/.test(exp) || Number(exp) <= now || !bytes) return false;
  // subtle.verify compares in constant time.
  return crypto.subtle.verify("HMAC", await key(secret), bytes, enc.encode(`admin:${exp}`));
}

/** Only an /admin path may be a return address (no open redirect to another site). */
export function safeAdminPath(from: unknown) {
  return typeof from === "string" && /^\/admin(\/|\?|$)/.test(from) ? from : "/admin";
}
