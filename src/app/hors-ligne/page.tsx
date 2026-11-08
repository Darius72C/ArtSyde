import type { Metadata } from "next";

export const metadata: Metadata = { title: "Hors ligne — ArtSyde", robots: { index: false } };

/*
 * Shown by the service worker (public/sw.js) when a page can't be reached and no copy of it was kept.
 * Plain markup, no animation: offline, the page's scripts may never load, and it must still read well.
 */
export default function Offline() {
  return (
    <main className="mx-auto flex min-h-svh max-w-[1440px] flex-col justify-center px-5 py-20 md:px-10">
      <p className="text-[15px] font-semibold tracking-[-0.03em]">ArtSyde</p>
      <h1 className="display mt-10 text-[clamp(3rem,10vw,7rem)] leading-[0.95]">
        Pas de connexion.
        <span className="block text-muted">On t&apos;attend.</span>
      </h1>
      <p className="mt-8 max-w-md leading-relaxed text-muted">
        Ton téléphone n&apos;arrive pas à joindre ArtSyde. Vérifie ta connexion (données mobiles ou Wi-Fi), puis réessaie. Ton panier est gardé sur cet appareil.
      </p>
      <div className="mt-10">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full reload is the point: it retries the network */}
        <a href="/" className="btn">
          Réessayer
        </a>
      </div>
    </main>
  );
}
