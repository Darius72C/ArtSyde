import Link from "next/link";

export default function ProductNotFound() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="font-display text-5xl text-curse-violet">404</p>
      <h1 className="text-xl">Ce t-shirt a disparu dans les ténèbres</h1>
      <p className="text-ghost-white/70">Il n&apos;existe pas ou n&apos;est plus en vente.</p>
      <Link href="/catalogue" className="text-curse-violet underline">
        Voir le catalogue
      </Link>
    </main>
  );
}
