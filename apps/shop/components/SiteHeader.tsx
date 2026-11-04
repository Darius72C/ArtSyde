import Link from "next/link";
import { Logo } from "@artsyde/ui";

const links = [
  { href: "/catalogue", label: "Catalogue" },
  { href: "/personnaliser", label: "Personnaliser" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-ash-gray bg-curse-black/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" aria-label="Accueil ArtSyde">
          <Logo size={22} />
        </Link>
        <nav className="flex gap-5 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-ghost-white/80 hover:text-curse-violet">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
