import { geniusConfig, paymentIn, signed } from "@/server/payments/geniuspay";
import { settle } from "@/server/payments/settle";
import { logActivity, logError } from "@/server/log";

/**
 * GeniusPay telling a payment changed (set this address in GeniusPay's dashboard:
 * https://<site>/api/geniuspay/webhook). Its signature checked, the payment is asked of GeniusPay itself
 * before anything is done; an order or a purchase is paid once, whatever arrives twice.
 */
export async function POST(request: Request) {
  const cfg = geniusConfig();
  if (!cfg) return Response.json({ status: "off" }, { status: 503 });

  const body = await request.text();
  if (body.length > 64 * 1024) return Response.json({ error: "too large" }, { status: 413 });
  if (!signed(cfg, body, request.headers)) {
    await logActivity("payment.webhook_refused", "Webhook GeniusPay refusé : signature invalide", { headers: { signature: Boolean(request.headers.get("x-webhook-signature") || request.headers.get("x-geniuspay-signature")) } });
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }

  let hook: { event?: string; data?: unknown } = {};
  try {
    hook = JSON.parse(body);
  } catch {}
  const said = paymentIn(hook.data);
  if (!said) return Response.json({ status: "ignored" });
  // The event says the status when the payment's own field doesn't (« payment.completed »).
  if (!said.status && hook.event?.includes(".")) said.status = hook.event.split(".").slice(1).join(".").toLowerCase();

  try {
    let status;
    try {
      status = await settle(said.reference); // asked of GeniusPay
    } catch (e) {
      // GeniusPay not answering about its own payment (its sandbox doesn't always): a webhook checked
      // with the secret is believed as it is.
      if (!cfg.webhookSecret) throw e;
      status = await settle(said.reference, said);
    }
    return Response.json({ status });
  } catch (e) {
    await logError("geniuspay.webhook", e, { event: hook.event, reference: said.reference });
    return Response.json({ error: "try again" }, { status: 502 }); // GeniusPay sends it again later
  }
}
