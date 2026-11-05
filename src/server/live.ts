import "server-only";

/*
 * Live updates with Server-Sent Events (EventSource in the browser). Each stream asks the database what
 * changed every few seconds (`tick`) and sends only that. A stream ends after about a minute and the browser
 * reconnects by itself (with the last event's id): that stays within serverless time limits (Vercel) and
 * needs no other service. The database is the source, so it works whichever server instance answers.
 */

export type LiveEvent = { event: string; data: unknown; id?: string };

export function sseResponse(request: Request, tick: () => Promise<LiveEvent[]>, { every = 3000, max = 55_000 } = {}) {
  const enc = new TextEncoder();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (s: string) => {
        if (!closed) controller.enqueue(enc.encode(s));
      };
      const close = () => {
        if (closed) return;
        closed = true;
        clearTimeout(timer);
        try {
          controller.close();
        } catch {}
      };
      request.signal.addEventListener("abort", close);
      const started = Date.now();
      write("retry: 3000\n\n"); // reconnect 3 s after the stream ends

      const loop = async () => {
        if (closed) return;
        try {
          for (const e of await tick()) write(`${e.id ? `id: ${e.id}\n` : ""}event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`);
          write(": ok\n\n"); // keeps proxies from closing an idle connection
        } catch (err) {
          console.error("[live] tick failed", err);
        }
        if (Date.now() - started > max) return close();
        timer = setTimeout(loop, every);
      };
      void loop();
    },
    cancel() {
      closed = true;
      clearTimeout(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}

/** The cursor a reconnecting browser sends (Last-Event-ID): an ISO date, or `fallback` (now). */
export function cursorFrom(request: Request, fallback = new Date()) {
  const id = request.headers.get("last-event-id");
  const d = id ? new Date(id) : null;
  return d && !Number.isNaN(d.getTime()) ? d : fallback;
}
