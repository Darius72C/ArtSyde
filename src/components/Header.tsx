"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { useCartCount } from "@/lib/cart";
import { authClient } from "@/lib/auth-client";
import { CART_BUMP } from "@/lib/flyToCart";
import { DUR, EASE, SPRING } from "@/lib/motion";

/** The account icon: the account page when signed in (with the first letter of the name), else the sign-in page. */
function AccountLink() {
  const { data } = authClient.useSession();
  const user = data?.user;
  return (
    <Link href={user ? "/compte" : "/connexion"} aria-label={user ? `Mon compte, ${user.name}` : "Se connecter"} className="nav-link hidden md:inline">
      {user ? (
        <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-ink text-[11px] font-semibold uppercase text-on-ink">{(user.name || user.email).slice(0, 1)}</span>
      ) : (
        <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="8" r="3.6" />
          <path d="M4.5 20c1.4-3.6 4.3-5.4 7.5-5.4s6.1 1.8 7.5 5.4" />
        </svg>
      )}
    </Link>
  );
}

const LINKS = [
  { href: "/#boutique", label: "Boutique" },
  { href: "/#nouveautes", label: "Nouveautés" },
  { href: "/studio", label: "Studio 3D" },
  { href: "/#equipes", label: "Équipes" },
  { href: "/#aide", label: "Aide" },
];
// public/icons/logo-header.png is 1.8 times wider than tall.
const LOGO_WIDTH = 72;
const LOGO_MASK = "url(/icons/logo-header.png) center / contain no-repeat";

export function Header() {
  // usePathname is request data on dynamic routes → stream it; fallback renders the same bar.
  return (
    <Suspense fallback={<Bar path={null} />}>
      <WithPath />
    </Suspense>
  );
}
function WithPath() {
  return <Bar path={usePathname()} />;
}

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 8V7a3 3 0 0 1 6 0v1" />
    </svg>
  );
}

/** True while a section marked `data-nav-dark` sits under the bar (the bar then turns dark). */
function useDarkUnderNav() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const els = document.querySelectorAll("[data-nav-dark]");
    if (!els.length) return;
    const seen = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
        setDark(seen.size > 0);
      },
      { rootMargin: "-24px 0px -96% 0px" }, // a thin band where the bar is
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return dark;
}

function Bar({ path }: { path: string | null }) {
  const user = authClient.useSession().data?.user; // the phone menu's "Compte": the account when signed in
  const count = useCartCount();
  const [open, setOpen] = useState(false);
  const dark = useDarkUnderNav();
  const bag = useAnimationControls();
  useEffect(() => {
    const onBump = () => bag.start({ scale: [1, 1.35, 0.9, 1.08, 1], rotate: [0, -12, 8, -4, 0], transition: { duration: DUR.base, ease: EASE.out } });
    window.addEventListener(CART_BUMP, onBump);
    return () => window.removeEventListener(CART_BUMP, onBump);
  }, [bag]);

  return (
    <header
      data-tone={dark && !open ? "dark" : undefined}
      style={{ viewTransitionName: "site-header" }}
      className="nav-tone sticky top-0 z-50 border-b border-line/60 bg-[var(--nav)] text-ink backdrop-blur-xl backdrop-saturate-150 transition-[background-color,border-color,color] duration-500"
    >
      <nav className="mx-auto flex h-12 max-w-[1024px] items-center justify-between px-5">
        <Link href="/" className="block" aria-label="ArtSyde, accueil">
          {/* The logo as a mask: it takes the header's text colour, white on dark, black on light. */}
          <span aria-hidden className="block h-[40px] bg-current" style={{ width: LOGO_WIDTH, WebkitMask: LOGO_MASK, mask: LOGO_MASK }} />
        </Link>
        <ul className="hidden items-center gap-9 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} aria-current={path === l.href ? "page" : undefined} className="nav-link nav-underline">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-5">
          <AccountLink />
          <Link href="/panier" id="cart-link" aria-label={`Panier, ${count} article${count > 1 ? "s" : ""}`} className="nav-link relative">
            <motion.span animate={bag} className="block">
              <BagIcon />
            </motion.span>
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={SPRING.pop}
                  className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-ink px-1 text-[10px] font-semibold text-on-ink"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu" className="relative h-6 w-6 md:hidden">
            <motion.span className="absolute left-1 right-1 top-[9px] h-px bg-ink" animate={open ? { rotate: 45, y: 3 } : { rotate: 0, y: 0 }} transition={SPRING.ui} />
            <motion.span className="absolute left-1 right-1 top-[15px] h-px bg-ink" animate={open ? { rotate: -45, y: -3 } : { rotate: 0, y: 0 }} transition={SPRING.ui} />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "100svh" }}
            exit={{ height: 0 }}
            transition={{ duration: DUR.base, ease: EASE.out }}
            className="overflow-hidden bg-bg md:hidden"
          >
            <ul className="px-10 pt-6">
              {[...LINKS, { href: user ? "/compte" : "/connexion", label: "Compte" }, { href: "/panier", label: "Panier" }].map((l, i) => (
                <motion.li key={l.href} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.03, duration: DUR.fast, ease: EASE.out }}>
                  <Link href={l.href} onClick={() => setOpen(false)} className="display block py-2 text-[28px]">
                    {l.label}
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
