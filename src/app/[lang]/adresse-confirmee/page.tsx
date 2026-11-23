import { getT, pageMetadata } from "@/lib/i18n/server";
import Link from "@/components/LocaleLink";
import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { creditBalance, getMyCustomer } from "@/server/account";

export const generateMetadata = pageMetadata("Adresse confirmée — ArtSyde", undefined, undefined, { robots: { index: false } });

/** Only a path of this site (never another site). */
const sitePath = (raw: string) => (raw.startsWith("/") && !raw.startsWith("//") ? raw : "/compte");

/*
 * Where the "Confirmer mon adresse" link of src/server/email/verify.ts leads (the `callbackURL` LoginView gives):
 * Better Auth checks the token, signs the customer in, then sends them here. `?suite=` is the page they came
 * from. When the link is bad (expired, already used), Better Auth adds `error` to that same address: as `&error=`,
 * or glued to `suite` as `?error=` since the address already has a query.
 */
async function Result({ searchParams }: Pick<PageProps<"/[lang]/adresse-confirmee">, "searchParams">) {
  const t = await getT();
  const sp = await searchParams;
  let suite = typeof sp.suite === "string" ? sp.suite : "";
  let error = typeof sp.error === "string" ? sp.error : "";
  const glued = suite.indexOf("?error=");
  if (glued >= 0) {
    error ||= suite.slice(glued + "?error=".length);
    suite = suite.slice(0, glued);
  }
  const next = sitePath(suite);

  if (error) {
    return (
      <Message eyebrow={t("Lien expiré")} title={t("Ce lien ne marche plus.")} muted={t("Pas de souci.")}>
        <p>{t("Il a expiré ou a déjà servi. Connecte-toi avec ton e-mail et ton mot de passe : si ton adresse n'est pas encore confirmée, on t'envoie aussitôt un nouveau lien.")}</p>
        <Actions primary={{ href: `/connexion?suite=${encodeURIComponent(next)}`, label: t("Se connecter") }} />
      </Message>
    );
  }

  const me = await getMyCustomer().catch(() => null);
  if (!me) {
    // Confirmed, but no session in this browser (the link opened elsewhere than where the account was made).
    return (
      <Message eyebrow={t("Compte activé")} title={t("Adresse confirmée.")} muted={t("Plus qu'à te connecter.")}>
        <p>{t("Ton compte ArtSyde est actif. Connecte-toi avec ton e-mail et ton mot de passe pour continuer.")}</p>
        <Actions primary={{ href: `/connexion?suite=${encodeURIComponent(next)}`, label: t("Se connecter") }} />
      </Message>
    );
  }

  const credits = await creditBalance(me.customer.id).catch(() => 0);
  const prenom = (me.user.name || "").trim().split(/\s+/)[0];
  return (
    <Message eyebrow={t("Compte activé")} title={t("Adresse confirmée.")} muted={prenom ? t("Bienvenue, {name}.", { name: prenom }) : t("Bienvenue.")}>
      <p>
        {t("Ton compte ArtSyde est actif.")}{" "}
        {credits > 0 ? t("Tes {n} crédits studio t'attendent : crée ton t-shirt en 3D.", { n: credits }) : t("Tu peux suivre tes commandes depuis ton compte.")}
      </p>
      <Actions primary={{ href: next, label: t("Continuer") }} secondary={next === "/studio" ? { href: "/compte", label: t("Mon compte") } : { href: "/studio", label: t("Ouvrir le studio") }} />
    </Message>
  );
}

function Message({ eyebrow, title, muted, children }: { eyebrow: string; title: string; muted: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-[70svh] max-w-[1440px] flex-col justify-center px-5 py-20 md:px-10">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="display mt-8 text-[clamp(3rem,10vw,7rem)] leading-[0.95]">
        {title}
        <span className="block text-muted">{muted}</span>
      </h1>
      <div className="mt-8 max-w-md leading-relaxed text-muted">{children}</div>
    </main>
  );
}

function Actions({ primary, secondary }: { primary: { href: string; label: string }; secondary?: { href: string; label: string } }) {
  return (
    <div className="mt-10 flex flex-wrap items-center gap-8">
      <Link href={primary.href} className="btn">
        {primary.label}
      </Link>
      {secondary && (
        <Link href={secondary.href} className="link-line">
          {secondary.label} <span className="arrow">→</span>
        </Link>
      )}
    </div>
  );
}

export default function Page(props: PageProps<"/[lang]/adresse-confirmee">) {
  return (
    <PageShell>
      <Suspense fallback={<div className="min-h-[70svh]" />}>
        <Result searchParams={props.searchParams} />
      </Suspense>
    </PageShell>
  );
}
