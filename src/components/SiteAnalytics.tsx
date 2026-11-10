"use client";

import { Analytics } from "@vercel/analytics/next";
import type { BeforeSendEvent } from "@vercel/analytics";

/*
 * Visitor counts with Vercel Web Analytics (turned on in Vercel > Analytics). It records each page seen, with its
 * address; this cleans the address before it leaves the browser:
 * - the admin, its sign-in and the API are not counted (the team, not visitors);
 * - the query is dropped, but for the utm_… campaign tags: some links carry secrets (?k= opens an order's
 *   tracking page, ?t= unsubscribes a newsletter) that must not end up in a third party's statistics.
 */
const NOT_COUNTED = /^\/(admin|connexion\/admin|api)(\/|$)/;

function clean(event: BeforeSendEvent): BeforeSendEvent | null {
  const url = new URL(event.url);
  if (NOT_COUNTED.test(url.pathname)) return null;
  const kept = new URLSearchParams();
  url.searchParams.forEach((value, key) => {
    if (key.startsWith("utm_")) kept.set(key, value);
  });
  url.search = kept.toString();
  return { ...event, url: url.toString() };
}

export function SiteAnalytics() {
  return <Analytics beforeSend={clean} />;
}
