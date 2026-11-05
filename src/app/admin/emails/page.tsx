import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { CampaignEditor } from "@/components/admin/CampaignEditor";
import { Segments } from "@/components/admin/Segments";
import { WelcomeEditor } from "@/components/admin/WelcomeEditor";
import { AdminPage, DbNotice, Empty, Loading, PageTitle, Panel, StatusLabel, TableScroll, table, td, th } from "@/components/admin/ui";
import { CAMPAIGNS, CAMPAIGN_KINDS, campaignKey, mergeCampaign, type CampaignKind, type CampaignTexts } from "@/lib/campaigns";
import { WELCOME_KEY, mergeWelcome, type WelcomeTexts } from "@/lib/email-texts";
import { requireAdmin } from "@/server/admin/auth";
import { removeSubscriber } from "@/server/admin/campaigns";
import { load } from "@/server/admin/queries";
import { SIGNUP_CREDITS } from "@/server/auth";
import { db } from "@/server/db";
import { campaignEmail } from "@/server/email/campaign";
import { emailAd, emailImage, latestProducts } from "@/server/email/image";
import { emailConfigured } from "@/server/email/send";
import { welcomeEmail } from "@/server/email/welcome";
import { r2Config } from "@/server/r2";

export const metadata: Metadata = { title: "E-mails" };

const BASE = "/admin/emails";
const SAMPLE = { name: "Awa Koné", email: "awa@exemple.com" };
type Tab = "bienvenue" | CampaignKind | "inscrits";
const TABS: { slug: Tab; label: string }[] = [{ slug: "bienvenue", label: "Bienvenue" }, ...CAMPAIGN_KINDS.map((k) => ({ slug: k as Tab, label: CAMPAIGNS[k].label })), { slug: "inscrits", label: "Inscrits" }];
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const when = (d: Date) => d.toLocaleString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

/** The saved words of a setting, read fresh (this is where they are edited). */
const savedOf = async <T,>(key: string) => ((await db.siteSetting.findUnique({ where: { key } }).catch(() => null))?.value ?? {}) as Partial<T>;

async function Welcome({ configured }: { configured: boolean }) {
  const saved = await savedOf<WelcomeTexts>(WELCOME_KEY);
  const welcome = welcomeEmail({ ...SAMPLE, credits: SIGNUP_CREDITS, image: await emailImage(), texts: mergeWelcome(saved), ad: await emailAd() });
  return (
    <Panel title="Bienvenue — à la création d'un compte">
      <WelcomeEditor saved={saved} initial={{ subject: welcome.subject, html: welcome.html }} configured={configured} imageConfigured={r2Config() !== null} />
    </Panel>
  );
}

async function Campaign({ kind, configured }: { kind: CampaignKind; configured: boolean }) {
  const [saved, image, products, ad, subscribers] = await Promise.all([savedOf<CampaignTexts>(campaignKey(kind)), emailImage(), latestProducts(), emailAd(), db.subscriber.count({ where: { unsubscribedAt: null } }).catch(() => 0)]);
  const e = campaignEmail(kind, mergeCampaign(kind, saved), { ...SAMPLE, image, products, ad });
  return (
    <Panel title={`${CAMPAIGNS[kind].label} — aux inscrits à la newsletter`}>
      <CampaignEditor kind={kind} saved={saved} initial={{ subject: e.subject, html: e.html }} configured={configured} imageConfigured={r2Config() !== null} subscribers={subscribers} />
    </Panel>
  );
}

async function Subscribers() {
  const r = await load(() => Promise.all([db.subscriber.findMany({ orderBy: { createdAt: "desc" }, take: 300 }), db.subscriber.count({ where: { unsubscribedAt: null } })]));
  if (r.problem) return <DbNotice problem={r.problem} />;
  const [rows, active] = r.data;
  return (
    <Panel title={`${active} inscrit${active > 1 ? "s" : ""} à la newsletter`}>
      <p className="-mt-2 mb-6 max-w-2xl text-sm text-muted">Les adresses laissées dans le formulaire « Ne rate aucun drop » de l&apos;accueil. Chaque e-mail envoyé contient un lien pour se désabonner. La liste montre les 300 dernières.</p>
      {rows.length ? (
        <TableScroll>
          <table className={`${table} min-w-[640px]`}>
            <thead>
              <tr>
                <th className={th}>Adresse</th>
                <th className={th}>Inscrit le</th>
                <th className={th}>État</th>
                <th className={th}>
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td className={td}>{s.email}</td>
                  <td className={`${td} whitespace-nowrap text-sm tabular-nums text-muted`}>{when(s.createdAt)}</td>
                  <td className={td}>{s.unsubscribedAt ? <StatusLabel tone="danger">Désabonné le {when(s.unsubscribedAt)}</StatusLabel> : <StatusLabel tone="ok">Inscrit</StatusLabel>}</td>
                  <td className={`${td} text-right`}>
                    {!s.unsubscribedAt && (
                      <form action={removeSubscriber.bind(null, s.id)}>
                        <button className="text-[15px] text-danger hover:underline">Retirer</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      ) : (
        <Empty title="Personne pour l'instant.">Le formulaire « Ne rate aucun drop » de l&apos;accueil remplit cette liste.</Empty>
      )}
    </Panel>
  );
}

async function Emails({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  await requireAdmin();
  const wanted = one((await searchParams).modele);
  const tab = TABS.find((t) => t.slug === wanted)?.slug ?? "bienvenue";
  const configured = emailConfigured();
  return (
    <div className="space-y-5">
      <Panel title="Envoi">
        <p className="text-[15px]">
          {configured ? (
            <span className="text-ok">Brevo est configuré : les e-mails partent.</span>
          ) : (
            <span className="text-new">Brevo n&apos;est pas encore configuré : rien n&apos;est envoyé pour l&apos;instant (les e-mails sont notés dans le journal).</span>
          )}
        </p>
        <p className="mt-2 text-sm text-muted">Variables : BREVO_API_KEY, EMAIL_FROM (adresse vérifiée dans Brevo), et en option EMAIL_FROM_NAME et EMAIL_REPLY_TO.</p>
      </Panel>
      <Segments id="emails" label="Modèle" items={TABS.map((t) => ({ href: `${BASE}?modele=${t.slug}`, label: t.label, active: t.slug === tab }))} />
      {tab === "bienvenue" ? <Welcome configured={configured} /> : tab === "inscrits" ? <Subscribers /> : <Campaign kind={tab} configured={configured} />}
    </div>
  );
}

export default function Page({ searchParams }: PageProps<"/admin/emails">) {
  return (
    <AdminPage>
      <PageTitle eyebrow="E-mails" lines={[{ text: "E-mails.", muted: "Bienvenue, newsletter, promotions, annonces." }]} />
      <Suspense fallback={<Loading />}>
        <Emails searchParams={searchParams} />
      </Suspense>
    </AdminPage>
  );
}
