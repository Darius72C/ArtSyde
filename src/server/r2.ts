import "server-only";
import { createHash, createHmac } from "node:crypto";

/*
 * Cloudflare R2 (S3-compatible) for product photos, signed by hand with AWS Signature V4
 * so no SDK is needed. The browser uploads straight to R2 with a short-lived presigned PUT
 * (the file never passes through a server action); the keys never leave the server.
 * Env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL (see .env.example).
 */

type R2Config = { account: string; keyId: string; secret: string; bucket: string; publicUrl: string };

export function r2Config(): R2Config | null {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) return null;
  return { account: R2_ACCOUNT_ID, keyId: R2_ACCESS_KEY_ID, secret: R2_SECRET_ACCESS_KEY, bucket: R2_BUCKET, publicUrl: R2_PUBLIC_URL.replace(/\/+$/, "") };
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const hmac = (key: Buffer | string, s: string) => createHmac("sha256", key).update(s).digest();
// RFC 3986, as SigV4 wants it.
const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

type SignInput = { method: string; host: string; path: string; region: string; keyId: string; secret: string; headers?: Record<string, string>; expires: number; now: Date };

/** AWS Signature V4, query-string form ("presigned URL"). Pure, so it can be checked against AWS's own examples. */
export function signUrl({ method, host, path, region, keyId, secret, headers = {}, expires, now }: SignInput) {
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); // 20261104T153000Z
  const date = amzDate.slice(0, 8);
  const scope = `${date}/${region}/s3/aws4_request`;

  const signed: Record<string, string> = { ...headers, host };
  const names = Object.keys(signed).sort();
  const signedHeaders = names.join(";");
  const query: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${keyId}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expires),
    "X-Amz-SignedHeaders": signedHeaders,
  };
  const canonicalQuery = Object.keys(query)
    .sort()
    .map((k) => `${enc(k)}=${enc(query[k])}`)
    .join("&");
  const canonicalHeaders = names.map((n) => `${n}:${signed[n].trim()}\n`).join("");
  const canonicalRequest = [method, path, canonicalQuery, canonicalHeaders, signedHeaders, "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");
  const kSigning = hmac(hmac(hmac(hmac(`AWS4${secret}`, date), region), "s3"), "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");
  return `https://${host}${path}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

/** A presigned URL for one request on `key`. `headers` (lower-case names) are signed: the request must send exactly them. */
export function presign(cfg: R2Config, method: "PUT" | "DELETE", key: string, headers: Record<string, string> = {}, expires = 300) {
  return signUrl({
    method,
    host: `${cfg.account}.r2.cloudflarestorage.com`,
    path: `/${enc(cfg.bucket)}/${key.split("/").map(enc).join("/")}`,
    region: "auto",
    keyId: cfg.keyId,
    secret: cfg.secret,
    headers,
    expires,
    now: new Date(),
  });
}

/** The object key behind one of our public photo URLs, or null if the URL is not ours. */
export function keyFromPublicUrl(cfg: R2Config, url: string) {
  const prefix = `${cfg.publicUrl}/`;
  return url.startsWith(prefix) ? decodeURIComponent(url.slice(prefix.length)) : null;
}

/** Deletes an object. Best effort: a photo left behind in the bucket costs little and breaks nothing. */
export async function deleteObject(cfg: R2Config, key: string) {
  try {
    const res = await fetch(presign(cfg, "DELETE", key), { method: "DELETE" });
    if (!res.ok && res.status !== 404) console.error("R2 delete failed", res.status, key);
  } catch (e) {
    console.error("R2 delete failed", e);
  }
}
