"use client";

import { useEffect, useRef } from "react";

/**
 * Listens to a live stream (src/app/api/live): `on(event, data)` for each named event. The browser
 * reconnects on its own when the stream ends; the stream is closed while the tab is hidden and with the component.
 */
export function useLive(url: string | null, events: string[], on: (event: string, data: unknown) => void) {
  const handler = useRef(on);
  useEffect(() => {
    handler.current = on;
  });
  const names = events.join(",");
  useEffect(() => {
    if (!url || typeof EventSource === "undefined") return;
    // Open only while the tab is visible: a stream keeps a server function running (and billed) the whole time.
    let source: EventSource | null = null;
    const open = () => {
      if (source || document.visibilityState !== "visible") return;
      source = new EventSource(url);
      for (const name of names.split(","))
        source.addEventListener(name, (e: MessageEvent) => {
          let data: unknown = null;
          try {
            data = JSON.parse(e.data);
          } catch {}
          handler.current(name, data);
        });
    };
    const shut = () => {
      source?.close();
      source = null;
    };
    const onVisibility = () => (document.visibilityState === "visible" ? open() : shut());
    document.addEventListener("visibilitychange", onVisibility);
    open();
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      shut();
    };
  }, [url, names]);
}
