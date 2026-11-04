"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { signOut } from "@/server/admin/actions";

export const ADMIN_LINKS = [
  { href: "/admin", label: "Vue d'ensemble" },
  { href: "/admin/commandes", label: "Commandes" },
  { href: "/admin/produits", label: "Produits et stock" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/studio", label: "Studio" },
  { href: "/admin/credits", label: "Crédits" },
  { href: "/admin/ventes", label: "Ventes" },
];

/** The admin's top bar, written like the shop's Header: same height, glass, links and underline. */
export function AdminBar() {
  // usePathname is request data on dynamic routes → stream it; the fallback renders the same bar.
  return (
    <Suspense fallback={<Bar path={null} />}>
      <WithPath />
    </Suspense>
  );
}
function WithPath() {
  return <Bar path={usePathname()} />;
}

const isCurrent = (path: string | null, href: string) => (href === "/admin" ? path === href : !!path?.startsWith(href));

function Bar({ path }: { path: string | null }) {
  const nav = useRef<HTMLElement>(null);
  // On phones the links scroll sideways: bring the current one into view.
  useEffect(() => {
    const el = nav.current;
    const current = el?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!el || !current || el.scrollWidth <= el.clientWidth) return;
    const box = el.getBoundingClientRect();
    const link = current.getBoundingClientRect();
    el.scrollTo({ left: el.scrollLeft + link.left - box.left - (box.width - link.width) / 2 });
  }, [path]);
  return (
    <header style={{ viewTransitionName: "site-header" }} className="sticky top-0 z-50 border-b border-line/60 bg-[var(--nav)] text-ink backdrop-blur-xl backdrop-saturate-150">
      {/* Phones: brand on the first row, the links on a second row that scrolls sideways. From md: one 48px row. */}
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-8 px-5 md:h-12 md:flex-nowrap md:px-10">
        <Link href="/admin" className="flex h-12 shrink-0 items-center text-[15px] font-semibold tracking-[-0.03em] md:h-auto" aria-label="Admin ArtSyde, vue d'ensemble">
          ArtSyde <span className="ml-1 font-normal text-muted">Admin</span>
        </Link>
        <div className="flex shrink-0 items-center gap-7 md:order-last">
          {/* Phones keep only "Se déconnecter" on the brand row, so it stays one row. */}
          <Link href="/" className="nav-link hidden lg:inline">
            Voir la boutique
          </Link>
          <form action={signOut}>
            <button className="nav-link nav-underline">Se déconnecter</button>
          </form>
        </div>
        <nav ref={nav} aria-label="Admin" className="-mx-5 w-[calc(100%+2.5rem)] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-5 md:mx-0 md:w-auto md:min-w-0 md:flex-1 md:px-0">
          <ul className="flex items-center gap-7 pb-3 pt-1 md:py-2">
            {ADMIN_LINKS.map((l) => (
              <li key={l.href} className="shrink-0">
                <Link href={l.href} aria-current={isCurrent(path, l.href) ? "page" : undefined} className="nav-link nav-underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
