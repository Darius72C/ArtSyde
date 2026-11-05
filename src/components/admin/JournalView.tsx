import type { LogKind } from "@/generated/prisma/client";
import { db } from "@/server/db";
import { load } from "@/server/admin/queries";
import { Search } from "./Search";
import { Segments } from "./Segments";
import { DbNotice, Empty, MoreLink, Panel, StatusLabel, TableScroll, table, td, th } from "./ui";

const KINDS: { slug: string; kind: LogKind; label: string; none: string }[] = [
  { slug: "activite", kind: "ACTIVITY", label: "Activité", none: "Pas encore d'activité enregistrée." },
  { slug: "emails", kind: "EMAIL", label: "E-mails", none: "Aucun e-mail encore." },
  { slug: "erreurs", kind: "ERROR", label: "Erreurs", none: "Aucune erreur. Tout va bien." },
];
const BASE = "/admin/journal";
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const when = (d: Date) => d.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
const TONE = { error: "danger", warning: "new", info: "ok" } as const;
/** The start of the last 7 days (request time: the page is dynamic). */
const weekAgo = () => new Date(Date.now() - 7 * 24 * 3600 * 1000);

/** The site's journal: activity, e-mails, server errors (LogEntry), newest first, searchable. */
export async function JournalView({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const current = KINDS.find((k) => k.slug === one(sp.type)) ?? KINDS[0];
  const q = one(sp.q)?.trim() || undefined;
  const r = await load(() =>
    Promise.all([
      db.logEntry.findMany({
        where: { kind: current.kind, ...(q ? { OR: [{ message: { contains: q, mode: "insensitive" } }, { action: { contains: q, mode: "insensitive" } }] } : {}) },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      db.logEntry.groupBy({ by: ["kind"], _count: { _all: true }, where: { createdAt: { gte: weekAgo() } } }),
    ]),
  );
  if (r.problem) return <DbNotice problem={r.problem} />;
  const [rows, week] = r.data;
  const count = (k: LogKind) => week.find((w) => w.kind === k)?._count._all ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <Segments id="journal" label="Type" items={KINDS.map((k) => ({ href: `${BASE}?type=${k.slug}`, label: k.label, count: count(k.kind), active: k.slug === current.slug }))} />
        <Search action={BASE} q={q} placeholder="Chercher : référence, e-mail, action" keep={{ type: current.slug }} />
      </div>
      <p className="text-sm text-muted">Les chiffres comptent les 7 derniers jours. La liste montre les 200 dernières lignes.</p>

      {rows.length ? (
        <Panel title={q ? `${rows.length} ligne${rows.length > 1 ? "s" : ""} pour « ${q} »` : current.label} action={q && <MoreLink href={`${BASE}?type=${current.slug}`}>Tout afficher</MoreLink>}>
          <TableScroll>
            <table className={`${table} min-w-[760px]`}>
              <thead>
                <tr>
                  <th className={th}>Quand</th>
                  <th className={th}>Ce qui s&apos;est passé</th>
                  <th className={th}>Qui</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id}>
                    <td className={`${td} whitespace-nowrap align-top text-sm tabular-nums text-muted`}>{when(l.createdAt)}</td>
                    <td className={`${td} align-top`}>
                      <StatusLabel tone={TONE[l.level as keyof typeof TONE] ?? "ok"}>
                        <span className="whitespace-normal">{l.message}</span>
                      </StatusLabel>
                      <p className="mt-1 font-mono text-xs text-muted">{l.action}</p>
                      {l.meta && (
                        <details className="mt-2 text-xs">
                          <summary className="cursor-pointer text-link">Détails</summary>
                          <pre className="mt-2 max-w-[640px] overflow-x-auto whitespace-pre-wrap rounded-xl bg-surface p-3 font-mono text-[11px] leading-relaxed text-muted">{JSON.stringify(l.meta, null, 2)}</pre>
                        </details>
                      )}
                    </td>
                    <td className={`${td} whitespace-nowrap align-top text-sm text-muted`}>{l.actor ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </Panel>
      ) : (
        <Empty title={q ? "Rien à ce nom." : current.none} actions={q ? <MoreLink href={`${BASE}?type=${current.slug}`}>Tout afficher</MoreLink> : undefined}>
          {q ? "Essaie une référence de commande ou une adresse e-mail." : "Les lignes apparaîtront ici au fil de l'activité du site."}
        </Empty>
      )}
    </div>
  );
}
