"use client";

import { useState } from "react";
import { track } from "@/lib/metrics";
import { shareOrDownload } from "@/lib/shareCard";

/**
 * « Partager » on a product page: the product's link (which WhatsApp, Facebook, X… show as a card, see
 * src/app/boutique/[slug]/carte) to the phone's share sheet or a network, copied, or the story card with
 * its QR code, to post or send as an image.
 */
export function ShareProduct({ name, price, slug, url }: { name: string; price: string; slug: string; url: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const text = `${name} sur ArtSyde · ${price}`;
  const say = (msg: string) => {
    setNote(msg);
    window.setTimeout(() => setNote(null), 2500);
  };
  const native = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const shareLink = async () => {
    try {
      await navigator.share({ title: name, text, url });
      track("product.share");
    } catch {
      // closed without sharing
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      track("product.share");
      say("Lien copié");
    } catch {
      say("Copie impossible : sélectionne le lien");
    }
  };
  const card = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/boutique/${slug}/carte`);
      if (!res.ok) throw new Error(String(res.status));
      const done = await shareOrDownload(await res.blob(), `artsyde-${slug}-carte.png`, `${text} : ${url}`);
      if (done !== "cancelled") {
        track("product.share");
        say(done === "shared" ? "Carte partagée" : "Carte téléchargée");
      }
    } catch {
      say("La carte n'a pas pu être préparée : réessaie");
    } finally {
      setBusy(false);
    }
  };

  const enc = encodeURIComponent;
  const networks = [
    { label: "WhatsApp", href: `https://wa.me/?text=${enc(`${text} : ${url}`)}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}` },
  ];
  const chip = "flex h-10 items-center justify-center rounded-full border border-line px-4 text-sm transition-colors hover:border-muted";

  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
        </svg>
        Partager
      </button>
      {open && (
        <div className="mt-3 space-y-3 rounded-2xl border border-line p-4">
          <div className="flex flex-wrap gap-2">
            {native && (
              <button type="button" onClick={shareLink} className={`${chip} border-ink bg-ink text-on-ink hover:border-ink`}>
                Partager…
              </button>
            )}
            {networks.map((n) => (
              <a key={n.label} href={n.href} target="_blank" rel="noopener noreferrer" onClick={() => track("product.share")} className={chip}>
                {n.label}
              </a>
            ))}
            <button type="button" onClick={copy} className={chip}>
              Copier le lien
            </button>
          </div>
          <button type="button" onClick={card} disabled={busy} className="btn-outline w-full !py-2.5 text-sm disabled:opacity-60">
            {busy ? "Préparation de la carte…" : "Télécharger la carte (story avec QR code)"}
          </button>
          <p className="text-xs text-muted" aria-live="polite">
            {note ?? "Le lien s'affiche en carte avec la photo et le prix ; la carte image mène au t-shirt par son QR code."}
          </p>
        </div>
      )}
    </div>
  );
}
