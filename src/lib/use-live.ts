"use client";

import { useEffect, useRef } from "react";

/**
 * Listens to a live stream (src/app/api/live): `on(event, data)` for each named event. The browser
 * reconnects on its own when the stream ends; the listener closes with the component.
 */
export function useLive(url: string | null, events: string[], on: (event: string, data: unknown) => void) {
  const handler = useRef(on);
  useEffect(() => {
    handler.current = on;
  });
  const names = events.join(",");
  useEffect(() => {
    if (!url || typeof EventSource === "undefined") return;
    const source = new EventSource(url);
    const listeners = names.split(",").map((name) => {
      const l = (e: MessageEvent) => {
        let data: unknown = null;
        try {
          data = JSON.parse(e.data);
        } catch {}
        handler.current(name, data);
      };
      source.addEventListener(name, l);
      return [name, l] as const;
    });
    return () => {
      listeners.forEach(([name, l]) => source.removeEventListener(name, l));
      source.close();
    };
  }, [url, names]);
}
