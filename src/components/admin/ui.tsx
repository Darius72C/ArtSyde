import Link from "next/link";
import type { ReactNode } from "react";
import { CountUp, FadeUp, RevealLines, type Line } from "../Reveal";
import { PageTransition } from "../PageFrame";
import { TONE_DOT, type Tone } from "@/lib/admin/labels";
import type { DbProblem } from "@/server/admin/queries";

/*
 * Building blocks shared by the admin pages only. They are the shop's own pieces
 * (tile, eyebrow, display, RevealLines, FadeUp, CountUp) set the way the shop's
 * page views set them.
 */

/** Page holder, as in the shop's page views, with the shop's page transition between admin pages. */
export function AdminPage({ children }: { children: ReactNode }) {
  return (
    <PageTransition>
      <div className="mx-auto max-w-[1440px] px-5 pb-24 md:px-10">{children}</div>
    </PageTransition>
  );
}

/** Eyebrow + two-tone headline; `aside` sits on the right on wide screens (a filter, a period). */
export function PageTitle({ eyebrow, lines, aside }: { eyebrow: ReactNode; lines: Line[]; aside?: ReactNode }) {
  return (
    <div className="flex flex-col items-start justify-between gap-6 pb-10 pt-14 md:flex-row md:items-end md:pb-14 md:pt-20">
      <div className="min-w-0">
        <p className="eyebrow mb-5">{eyebrow}</p>
        <RevealLines as="h1" lines={lines} className="display text-5xl md:text-6xl" />
      </div>
      {aside && <div className="max-w-full shrink-0">{aside}</div>}
    </div>
  );
}

/** A tile with a title row; `action` is a link on the right of the title. */
export function Panel({ title, action, children, className = "", delay = 0 }: { title: string; action?: ReactNode; children: ReactNode; className?: string; delay?: number }) {
  return (
    <FadeUp delay={delay} className={`tile p-8 ${className}`}>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[21px] font-semibold">{title}</p>
        {action}
      </div>
      <div className="mt-6">{children}</div>
    </FadeUp>
  );
}

/** "Toutes les commandes ›" */
export function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="link-line shrink-0 !text-[15px]">
      {children} <span className="arrow">›</span>
    </Link>
  );
}

/** A headline number in its own tile. */
export function Stat({ label, value, unit, note, delay = 0 }: { label: string; value: number; unit?: string; note?: ReactNode; delay?: number }) {
  return (
    <FadeUp delay={delay} className="tile flex flex-col p-8">
      <p className="text-[15px] text-muted">{label}</p>
      <p className="display mt-4 text-5xl leading-none">
        {/* Full width: CountUp starts once it is 10% inside the screen on every side, which a short number in the first column never is. */}
        <CountUp to={value} className="block" />
      </p>
      {unit && <p className="mt-2 text-muted">{unit}</p>}
      {note && <p className="mt-auto pt-5 text-sm text-muted">{note}</p>}
    </FadeUp>
  );
}

/** "+12 % sur la période précédente", green up, red down. */
export function Delta({ value, against }: { value: number | null; against: string }) {
  if (value === null) return <>Rien à comparer {against}</>;
  const tone = value > 0 ? "text-ok" : value < 0 ? "text-danger" : "text-muted";
  return (
    <>
      <span className={`font-medium tabular-nums ${tone}`}>
        {value > 0 ? "+" : value < 0 ? "−" : ""}
        {Math.abs(value)} %
      </span>{" "}
      {against}
    </>
  );
}

/** A status: a dot in the status colour, and its words (never the colour alone). */
export function StatusLabel({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${TONE_DOT[tone]}`} />
      {children}
    </span>
  );
}

/** Fabric colour swatch, as in the cart. */
export function Swatch({ hex, name, className = "" }: { hex: string; name?: string; className?: string }) {
  return <span role={name ? "img" : undefined} aria-label={name} title={name} className={`inline-block h-3 w-3 shrink-0 rounded-full ring-1 ring-line ${className}`} style={{ background: hex }} />;
}

/** A row with its share of the whole as a thin bar under it. */
export function Share({ label, value, share }: { label: string; value: string; share: number }) {
  return (
    <li>
      <div className="flex items-baseline justify-between gap-4 text-[15px]">
        <span>{label}</span>
        <span className="tabular-nums text-muted">
          {value} · {Math.round(share * 100)} %
        </span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-line">
        <div className="h-full rounded-full bg-accent" style={{ width: `${share * 100}%` }} />
      </div>
    </li>
  );
}

/** Same loading line as the shop's order page. */
export function Loading() {
  return <div className="mx-auto my-32 h-px w-24 animate-pulse bg-ink/40" />;
}

/** Empty state, as in the cart. */
export function Empty({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="tile px-8 py-16 text-center md:py-20">
      <p className="display text-4xl">{title}</p>
      <div className="mx-auto mt-4 max-w-md text-muted">{children}</div>
      {actions && <div className="mt-10 flex flex-wrap items-center justify-center gap-8">{actions}</div>}
    </div>
  );
}

const Cmd = ({ children }: { children: ReactNode }) => <code className="rounded-md bg-bg px-1.5 py-0.5 text-[15px] text-ink">{children}</code>;

/** What a page shows while the database is not ready. */
export function DbNotice({ problem }: { problem: DbProblem }) {
  if (problem === "config")
    return (
      <Empty title="La base n'est pas configurée.">
        Ajoute <Cmd>DATABASE_URL</Cmd> et <Cmd>DIRECT_URL</Cmd> dans le fichier <Cmd>.env</Cmd> à la racine du projet, puis relance <Cmd>pnpm dev</Cmd>.
      </Empty>
    );
  if (problem === "schema")
    return (
      <Empty title="La base n'a pas encore ses tables.">
        Lance <Cmd>pnpm db:deploy</Cmd> pour appliquer les migrations, puis <Cmd>pnpm db:seed</Cmd> si tu veux des données d&apos;exemple.
      </Empty>
    );
  return (
    <Empty title="Impossible de joindre la base.">
      Vérifie ta connexion et les URL Neon dans <Cmd>.env</Cmd>, puis recharge la page.
    </Empty>
  );
}

/* Tables: the shop's row values (hairline separators, muted detail, tabular amounts). */
/** Add a `min-w-*` where the table is used, so it scrolls sideways on phones instead of squeezing. */
export const table = "w-full border-collapse text-left text-[15px]";
export const th = "border-b border-line pb-3 pr-6 text-xs font-normal text-muted last:pr-0";
export const td = "border-b border-line py-4 pr-6 align-middle last:pr-0";
/** Lets a wide table scroll sideways inside its tile without breaking the tile's padding. */
export function TableScroll({ children }: { children: ReactNode }) {
  return <div className="-mx-8 overflow-x-auto px-8">{children}</div>;
}
