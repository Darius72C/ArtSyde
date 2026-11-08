/*
 * ArtSyde's service worker: makes the site installable as an app and keeps it usable on a weak connection.
 * - Pages: from the network first; offline, the last copy seen, else the "hors ligne" page.
 * - Built files (/_next/static, immutable) and the icons: from the cache first.
 * - Never cached: the API, the admin, sign-in, the cart and checkout, accounts (always fresh and private).
 * Bump VERSION to drop every old cache on the next visit.
 */
const VERSION = "v1";
const STATIC = `artsyde-static-${VERSION}`;
const PAGES = `artsyde-pages-${VERSION}`;
const OFFLINE = "/hors-ligne";
const PRECACHE = [OFFLINE, "/icons/icon-192.png", "/icons/icon-512.png"];
const PRIVATE = /^\/(api|admin|connexion|compte|panier|commande|suivi|desabonnement)(\/|$)/;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("artsyde-") && k !== STATIC && k !== PAGES).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // photos (R2), payments, Google: the browser as usual
  if (PRIVATE.test(url.pathname)) {
    // Private pages still get the offline page when there is no network at all.
    if (req.mode === "navigate") event.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/models/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(STATIC).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Public pages (the HTML only, not the RSC requests of client-side navigation).
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match(OFFLINE))),
    );
  }
});
