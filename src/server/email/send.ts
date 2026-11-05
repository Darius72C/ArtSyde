import "server-only";
import { logEmail } from "@/server/log";

/**
 * Transactional e-mails through Brevo (https://www.brevo.com), with its HTTP API: no SDK.
 *
 * Needs BREVO_API_KEY (Brevo > SMTP & API > API keys) and EMAIL_FROM, an address of a domain or sender
 * verified in Brevo (Senders, domains & dedicated IPs). Until both are set, nothing is sent: the e-mail is
 * logged as skipped, so sign-up and orders keep working.
 */

export type Email = {
  to: { email: string; name?: string };
  subject: string;
  html: string;
  text: string;
  /** Brevo tags, to find the e-mail in its logs (e.g. "welcome"). */
  tags?: string[];
  /** Extra headers (List-Unsubscribe for the newsletters). */
  headers?: Record<string, string>;
};

export type SendResult = { ok: true; id?: string } | { ok: false; skipped?: boolean; error?: string };

export const emailConfigured = () => Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM);

export async function sendEmail(email: Email): Promise<SendResult> {
  const key = process.env.BREVO_API_KEY;
  const from = process.env.EMAIL_FROM;
  const meta = { to: email.to.email, subject: email.subject, tags: email.tags };
  if (!key || !from) {
    console.info(`[email] Brevo not configured (BREVO_API_KEY, EMAIL_FROM): "${email.subject}" to ${email.to.email} not sent.`);
    await logEmail("email.skipped", `« ${email.subject} » non envoyé à ${email.to.email} : Brevo pas encore configuré`, meta);
    return { ok: false, skipped: true };
  }
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: from, name: process.env.EMAIL_FROM_NAME || "ArtSyde" },
        to: [email.to.name ? email.to : { email: email.to.email }],
        ...(process.env.EMAIL_REPLY_TO ? { replyTo: { email: process.env.EMAIL_REPLY_TO } } : {}),
        subject: email.subject,
        htmlContent: email.html,
        textContent: email.text,
        tags: email.tags,
        ...(email.headers ? { headers: email.headers } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const error = await res.text().catch(() => "");
      console.error(`[email] Brevo refused "${email.subject}" (${res.status})`, error.slice(0, 300));
      await logEmail("email.failed", `« ${email.subject} » refusé par Brevo pour ${email.to.email} (${res.status})`, { ...meta, status: res.status, error: error.slice(0, 300) });
      return { ok: false, error: `${res.status}` };
    }
    const body = (await res.json().catch(() => ({}))) as { messageId?: string };
    await logEmail("email.sent", `« ${email.subject} » envoyé à ${email.to.email}`, { ...meta, messageId: body.messageId });
    return { ok: true, id: body.messageId };
  } catch (e) {
    console.error(`[email] "${email.subject}" not sent`, e);
    await logEmail("email.failed", `« ${email.subject} » non envoyé à ${email.to.email} : Brevo injoignable`, { ...meta, error: e instanceof Error ? e.message : String(e) });
    return { ok: false, error: "network" };
  }
}
