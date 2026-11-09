import "server-only";
import { db } from "@/server/db";
import type { Prisma } from "@/generated/prisma/client";

/*
 * The site's journal (LogEntry), read in /admin/journal and used by the live updates (src/app/api/live):
 * e-mails, activity (orders, payments, stock, credits, catalogue, admin sign-ins) and server errors.
 * Writing to it never throws: a journal line must never break what it records.
 */

type Meta = Record<string, unknown>;

async function write(data: Prisma.LogEntryCreateInput) {
  try {
    await db.logEntry.create({ data });
  } catch (e) {
    // The table may not exist yet (migration not applied) or the database may be down: the console keeps it.
    console.error("[log] not written:", data.action, data.message, e instanceof Error ? e.message : e);
  }
}

const json = (meta?: Meta) => (meta ? (JSON.parse(JSON.stringify(meta)) as Prisma.InputJsonValue) : undefined);

/** Something that happened: `action` a short code ("order.placed"), `message` the sentence shown in the admin. */
export function logActivity(action: string, message: string, meta?: Meta, actor = "système") {
  return write({ kind: "ACTIVITY", action, message, meta: json(meta), actor });
}

/** Something that happened and needs a look (shown as a warning in the journal), e.g. a payment to check by hand. */
export function logWarning(action: string, message: string, meta?: Meta, actor = "système") {
  return write({ kind: "ACTIVITY", action, message, meta: json(meta), actor, level: "warning" });
}

/** An e-mail sent, failed or skipped (Brevo not set up). */
export function logEmail(action: "email.sent" | "email.failed" | "email.skipped", message: string, meta?: Meta) {
  return write({ kind: "EMAIL", action, message, meta: json(meta), level: action === "email.failed" ? "error" : action === "email.skipped" ? "warning" : "info" });
}

/** A server error: logged to the console as before, and to the journal so it shows in the admin. */
export function logError(where: string, error: unknown, meta?: Meta) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${where}]`, error);
  return write({
    kind: "ERROR",
    action: where,
    message: message.slice(0, 500),
    meta: json({ ...meta, stack: error instanceof Error ? error.stack?.split("\n").slice(0, 6).join("\n") : undefined }),
    level: "error",
  });
}
