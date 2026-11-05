import { unsubscribeNewsletter } from "@/server/newsletter";

/**
 * One-click unsubscribe (RFC 8058): Gmail and Apple Mail show a "Se désabonner" button next to the sender
 * and POST here (List-Unsubscribe header of each newsletter). Only POST: link checkers that open links do nothing.
 */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const r = await unsubscribeNewsletter(token);
  return new Response(r.ok ? "Désabonné." : r.message, { status: r.ok ? 200 : 404 });
}
