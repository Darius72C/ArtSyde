import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { WelcomeEditor } from "@/components/admin/WelcomeEditor";
import { WELCOME_KEY, mergeWelcome, type WelcomeTexts } from "@/lib/email-texts";
import { db } from "@/server/db";
import { AdminPage, Loading, PageTitle, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/server/admin/auth";
import { SIGNUP_CREDITS } from "@/server/auth";
import { emailConfigured } from "@/server/email/send";
import { welcomeEmail } from "@/server/email/welcome";
import { emailImage } from "@/server/email/image";

export const metadata: Metadata = { title: "E-mails" };

async function Emails() {
  await connection();
  await requireAdmin();
  const configured = emailConfigured();
  // Sample customer, to see the e-mail as a real one.
  // The saved words (read fresh, not cached: this is where they are edited).
  const saved = ((await db.siteSetting.findUnique({ where: { key: WELCOME_KEY } }).catch(() => null))?.value ?? {}) as Partial<WelcomeTexts>;
  const welcome = welcomeEmail({ name: "Awa Koné", email: "awa@exemple.com", credits: SIGNUP_CREDITS, image: await emailImage(), texts: mergeWelcome(saved) });
  return (
    <div className="space-y-5">
      <Panel title="Envoi">
        <p className="text-[15px]">
          {configured ? (
            <span className="text-ok">Brevo est configuré : les e-mails partent.</span>
          ) : (
            <span className="text-new">Brevo n&apos;est pas encore configuré : rien n&apos;est envoyé pour l&apos;instant (les e-mails sont notés dans le journal du serveur).</span>
          )}
        </p>
        <p className="mt-2 text-sm text-muted">Variables : BREVO_API_KEY, EMAIL_FROM (adresse vérifiée dans Brevo), et en option EMAIL_FROM_NAME et EMAIL_REPLY_TO.</p>
      </Panel>
      <Panel title="Bienvenue — à la création d'un compte">
        <WelcomeEditor saved={saved} initial={{ subject: welcome.subject, html: welcome.html }} configured={configured} />
      </Panel>
    </div>
  );
}

export default function Page() {
  return (
    <AdminPage>
      <PageTitle eyebrow="E-mails" lines={[{ text: "E-mails.", muted: "Ce que reçoivent les clients." }]} />
      <Suspense fallback={<Loading />}>
        <Emails />
      </Suspense>
    </AdminPage>
  );
}
