import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/*
 * GeniusPay (geniuspay.ci): Mobile Money (Wave, Orange Money, MTN, Moov) and cards in Côte d'Ivoire.
 * Ported from the babi-life integration, which runs in production.
 *
 * A payment is created on GeniusPay; the customer pays on GeniusPay's own page (checkout_url) and comes back.
 * Its word on a payment is only believed when asked directly (getPayment, with the secret key): a webhook
 * only says « go and look ».
 *
 * Environment (never in the code): GENIUSPAY_API_KEY (pk_…), GENIUSPAY_API_SECRET (sk_…),
 * GENIUSPAY_WEBHOOK_SECRET (whsec_…, checks the webhooks' signature), GENIUSPAY_SANDBOX=true for test keys,
 * GENIUSPAY_BASE_URL (optional). Without the two keys, online payment is off: orders wait for a payment
 * confirmed by hand, as before.
 */

const DEFAULT_BASE = "https://geniuspay.ci/api/v1/merchant";

export type GeniusConfig = { key: string; secret: string; webhookSecret: string; base: string; test: boolean };

/** GeniusPay's settings from the environment, or null: online payment off. */
export function geniusConfig(): GeniusConfig | null {
  const key = process.env.GENIUSPAY_API_KEY;
  const secret = process.env.GENIUSPAY_API_SECRET;
  if (!key || !secret) return null;
  // The API moved from pay.genius.ci to geniuspay.ci (the old host's firewall turns servers away).
  const base = (process.env.GENIUSPAY_BASE_URL || DEFAULT_BASE).replace(/\/+$/, "").replace("://pay.genius.ci", "://geniuspay.ci");
  return { key, secret, webhookSecret: process.env.GENIUSPAY_WEBHOOK_SECRET ?? "", base, test: process.env.GENIUSPAY_SANDBOX === "true" };
}

export const onlinePaymentEnabled = () => geniusConfig() !== null;

/** Test keys (pk_sandbox_…, pk_test_…, or GENIUSPAY_SANDBOX=true): nothing is really paid. */
export function sandbox(cfg: GeniusConfig) {
  const k = cfg.key.toLowerCase();
  return cfg.test || k.startsWith("pk_sandbox") || k.startsWith("pk_test") || k.includes("_sandbox_") || k.includes("_test_");
}

/** GeniusPay's payment_method for each way to pay the shop offers (src/lib/credits.ts PAYMENT_METHODS). */
export const GENIUS_METHOD: Record<string, string> = { WAVE: "wave", ORANGE_MONEY: "orange_money", MTN: "mtn_money", MOOV: "moov_money" };

export type NewPayment = {
  amount: number; // XOF, 200 at least
  currency: "XOF";
  description: string;
  customer?: { name?: string; email?: string };
  payment_method?: string;
  success_url: string;
  error_url: string;
  webhook_url?: string;
  metadata?: Record<string, string>;
};

export type GeniusPayment = { reference: string; amount: number; currency: string; status: string; environment: string; url: string };

/** GeniusPay's words for a payment received. */
export const paidStatus = (s: string) => ["completed", "complete", "success", "successful", "succeeded", "paid", "approved", "validated"].includes(s.toLowerCase());
/** Its words for a payment that won't happen (the customer can try again). */
export const failedStatus = (s: string) => ["failed", "expired", "cancelled", "canceled", "declined", "rejected"].includes(s.toLowerCase());

const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : 0);

/** The payment in an answer or a webhook's data, where it is, or one level down (« payment », « transaction »). */
export function paymentIn(data: unknown): GeniusPayment | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const p = (typeof d.reference === "string" && d.reference ? d : (d.payment as Record<string, unknown>) ?? (d.transaction as Record<string, unknown>)) as Record<string, unknown> | undefined;
  if (!p || typeof p.reference !== "string" || !p.reference) return null;
  return {
    reference: p.reference,
    amount: num(p.amount),
    currency: String(p.currency ?? ""),
    status: String(p.status ?? "").toLowerCase(),
    environment: String(p.environment ?? ""),
    url: String(p.checkout_url || p.payment_url || ""),
  };
}

async function call(cfg: GeniusConfig, method: "GET" | "POST", path: string, body?: unknown): Promise<GeniusPayment> {
  const res = await fetch(cfg.base + path, {
    method,
    headers: {
      "X-API-Key": cfg.key,
      "X-API-Secret": cfg.secret,
      Accept: "application/json",
      "Content-Type": "application/json",
      // Named: GeniusPay's firewall (Imunify360) turns away anonymous « bots ».
      "User-Agent": "ArtSyde/1.0 (+https://artsyde.ci)",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  const raw = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(raw);
  } catch {}
  if (!res.ok) {
    const err = json.error as { code?: string; message?: string } | undefined;
    let message = String(json.message ?? "") || (err?.message ? `${err.code ?? ""} ${err.message}`.trim() : "") || `${res.status} ${res.statusText}`;
    if (json.errors) message += ` ${JSON.stringify(json.errors)}`;
    throw new Error(`geniuspay ${method} ${path}: ${message} (${raw.slice(0, 300)})`);
  }
  // The payment under « data », or the answer itself.
  const p = paymentIn(json.data && typeof json.data === "object" ? json.data : json);
  if (!p) throw new Error(`geniuspay ${method} ${path}: no payment in the answer (${raw.slice(0, 300)})`);
  return p;
}

/** Creates a payment: its reference and the page to pay on. */
export const createPayment = (cfg: GeniusConfig, p: NewPayment) => call(cfg, "POST", "/payments", p);
/** A payment as GeniusPay has it now. */
export const getPayment = (cfg: GeniusConfig, reference: string) => call(cfg, "GET", `/payments/${encodeURIComponent(reference)}`);

/**
 * A webhook's signature right (HMAC-SHA256 with the webhook secret). Two ways are in use: X-Webhook-Signature
 * over « timestamp.body », the timestamp within five minutes; or X-GeniusPay-Signature over the body.
 * No secret set: nothing to check it with (the payment is asked of GeniusPay all the same before anything).
 */
export function signed(cfg: GeniusConfig, body: string, headers: Headers, now = Date.now()) {
  if (!cfg.webhookSecret) return true;
  const mac = (msg: string) => createHmac("sha256", cfg.webhookSecret).update(msg).digest("hex");
  const clean = (s: string) => s.trim().replace(/^sha256=/i, "").toLowerCase();
  const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
  const sig = headers.get("x-webhook-signature");
  if (sig) {
    const ts = headers.get("x-webhook-timestamp") ?? "";
    let t = Number(ts);
    if (!Number.isFinite(t) || !ts) return false;
    if (t > 1e12) t /= 1000; // in milliseconds
    if (Math.abs(now / 1000 - t) > 300) return false;
    return same(clean(sig), mac(`${ts}.${body}`));
  }
  const sig2 = headers.get("x-geniuspay-signature");
  if (sig2) return same(clean(sig2), mac(body));
  return false;
}
