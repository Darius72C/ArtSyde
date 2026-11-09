import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { createAuthMiddleware } from "better-auth/api";
import { after } from "next/server";
import { db } from "@/server/db";
import { emailConfigured, sendEmail } from "@/server/email/send";
import { VERIFY_HOURS, verifyEmail } from "@/server/email/verify";
import { welcomeEmail, welcomeTexts } from "@/server/email/welcome";
import { emailAd, emailImage } from "@/server/email/image";
import { logActivity, logError } from "@/server/log";
import { IS_PRODUCTION, SITE_URL } from "@/lib/site";

/** Studio credits given once to every new account. */
export const SIGNUP_CREDITS = 5;

const google =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET, prompt: "select_account" as const } }
    : undefined;

/** Whether "Continuer avec Google" can be shown (the two GOOGLE_* keys are set). */
export const googleEnabled = Boolean(google);

/**
 * Links a new account to its customer (orders, credits): the customer with the same e-mail if there is one
 * (someone who ordered before signing up), else a new customer. The signup credits are given once.
 */
export async function linkCustomer(user: { id: string; name: string; email: string }): Promise<{ bonus: boolean; already?: boolean }> {
  const email = user.email.toLowerCase();
  // An e-mail whose account was deleted (src/server/account-settings.ts) finds its archived customer here:
  // linked back to it, with the signup credits it already had once, so none are given again.
  return db.$transaction(async (tx) => {
    // Already linked (welcome() runs at the confirmation, and getMyCustomer() can call this again): nothing to do.
    if (await tx.customer.findUnique({ where: { userId: user.id }, select: { id: true } })) return { bonus: false, already: true };
    const sameEmail = await tx.customer.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true, userId: true } });
    const customer =
      sameEmail && !sameEmail.userId
        ? await tx.customer.update({ where: { id: sameEmail.id }, data: { userId: user.id }, select: { id: true } })
        : // (An e-mail already held by another account's customer stays with it: the new customer has none.)
          await tx.customer.create({ data: { name: user.name || email.split("@")[0], email: sameEmail ? undefined : email, userId: user.id }, select: { id: true } });
    const bonus = await tx.creditEntry.findFirst({ where: { customerId: customer.id, reason: "SIGNUP_BONUS" }, select: { id: true } });
    if (!bonus) await tx.creditEntry.create({ data: { customerId: customer.id, amount: SIGNUP_CREDITS, reason: "SIGNUP_BONUS" } });
    return { bonus: !bonus };
  });
}

/**
 * Once an account's address is known to be its owner's (confirmed by the link, or given by Google): linked to
 * its customer (orders, credits), the signup credits given once, the welcome e-mail sent.
 */
async function welcome(user: { id: string; name: string; email: string }) {
  let bonus = true;
  try {
    const linked = await linkCustomer(user);
    if (linked.already) return; // welcomed before: nothing to give or send again
    bonus = linked.bonus;
    await logActivity(
      bonus ? "account.created" : "account.returned",
      bonus
        ? `Nouveau compte : ${user.name || user.email} (${user.email})`
        : `Compte recréé : ${user.name || user.email} (${user.email}) — relié à sa fiche archivée, pas de crédits offerts`,
      { userId: user.id },
      `compte:${user.id}`,
    );
  } catch (e) {
    await logError("linkCustomer", e, { userId: user.id }); // the account works; the customer is linked on the next visit
  }
  // Coming back with an e-mail that already had its signup credits: no welcome gift to announce.
  if (!bonus) return;
  // The welcome e-mail, sent after the response so sign-up isn't slowed down (skipped until Brevo is set up).
  const send = async () => sendEmail(welcomeEmail({ name: user.name, email: user.email, credits: SIGNUP_CREDITS, image: await emailImage(), texts: await welcomeTexts(), ad: await emailAd() }));
  try {
    after(send);
  } catch {
    void send(); // outside a request (scripts): send right away
  }
}

/**
 * Customer accounts (Better Auth): Google, or e-mail and password. Tables User, Session, Account and
 * Verification (prisma/schema.prisma); routes under /api/auth (src/app/api/auth/[...all]/route.ts).
 * Needs BETTER_AUTH_SECRET, and GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET for Google (see .env.example).
 */
/**
 * A Vercel preview (a pull request's test site) lives on its own *.vercel.app addresses: the branch's stable one and
 * the deployment's own. Better Auth refuses requests from an origin it doesn't trust (403), so these are added.
 */
const PREVIEW_URLS =
  process.env.VERCEL_ENV === "preview"
    ? [process.env.VERCEL_BRANCH_URL, process.env.VERCEL_URL].filter((h): h is string => Boolean(h)).map((h) => `https://${h}`)
    : [];

/**
 * The confirmation link first shows /adresse-confirmee ("Adresse confirmée", or "Ce lien ne marche plus"), which
 * then leads on to the page the customer came from. Done here, on the link only: the same `callbackURL` given to
 * sign-in would otherwise send every ordinary sign-in to that page too.
 */
function throughConfirmedPage(url: string) {
  try {
    const u = new URL(url);
    const back = u.searchParams.get("callbackURL") || "/compte";
    if (!back.startsWith("/adresse-confirmee")) u.searchParams.set("callbackURL", `/adresse-confirmee?suite=${encodeURIComponent(back.startsWith("/") && !back.startsWith("//") ? back : "/compte")}`);
    return u.toString();
  } catch {
    return url;
  }
}

export const auth = betterAuth({
  // The live site always uses its real domain (a BETTER_AUTH_URL left at localhost would send Google back
  // to http://localhost:3000/api/auth/callback/google). A preview uses its own address, so the confirmation link
  // brings the tester back to it. Elsewhere: BETTER_AUTH_URL, or the request's address.
  baseURL: IS_PRODUCTION ? SITE_URL : PREVIEW_URLS[0] ?? (process.env.BETTER_AUTH_URL || undefined),
  // artsyde.store redirects to www, but both are accepted as origins.
  trustedOrigins: IS_PRODUCTION ? [SITE_URL, SITE_URL.replace("://www.", "://")] : PREVIEW_URLS.length ? PREVIEW_URLS : undefined,
  database: prismaAdapter(db, { provider: "postgresql" }),
  // An e-mail sign-up must confirm its address before it can sign in: no one can open an account, see orders or
  // get the signup credits with an address that isn't theirs. Only when Brevo is set up: without it no link
  // could be sent, and nobody could sign up with an e-mail at all.
  emailAndPassword: { enabled: true, minPasswordLength: 8, autoSignIn: true, requireEmailVerification: emailConfigured() },
  emailVerification: {
    sendOnSignUp: true,
    // Trying to sign in before confirming sends a fresh link (the first one may be lost or expired).
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: VERIFY_HOURS * 60 * 60,
    sendVerificationEmail: async ({ user, url }) => {
      const link = throughConfirmedPage(url);
      // Not awaited by the request (Better Auth's advice: the answer takes the same time whether the address exists).
      const send = () => sendEmail(verifyEmail({ name: user.name, email: user.email, url: link }));
      try {
        after(send);
      } catch {
        void send();
      }
    },
    afterEmailVerification: async (user) => {
      await logActivity("account.verified", `Adresse confirmée : ${user.name || user.email} (${user.email})`, { userId: user.id }, `compte:${user.id}`);
      await welcome(user);
    },
  },
  socialProviders: google,
  // Someone who signed up with e-mail and later uses Google with the same address gets one account.
  account: { accountLinking: { enabled: true, trustedProviders: ["google"] } },
  databaseHooks: {
    user: {
      create: {
        // Google gives a confirmed address: welcomed now. An e-mail sign-up waits for its link (afterEmailVerification).
        after: async (user) => {
          if (user.emailVerified) return welcome(user);
          await logActivity("account.pending", `Inscription en attente de confirmation : ${user.name || user.email} (${user.email})`, { userId: user.id }, `compte:${user.id}`);
        },
      },
    },
    account: {
      create: {
        // A Google sign-in on an address nobody confirmed (an e-mail sign-up whose link was never clicked):
        // Google proves the address is this person's. The password someone else may have set with it is dropped
        // (it could never be used: unconfirmed accounts can't sign in), then the account is confirmed and welcomed.
        after: async (account) => {
          if (account.providerId === "credential") return;
          const user = await db.user.findUnique({ where: { id: account.userId }, select: { id: true, name: true, email: true, emailVerified: true } });
          if (!user || user.emailVerified) return;
          await db.account.deleteMany({ where: { userId: user.id, providerId: "credential" } });
          await db.user.update({ where: { id: user.id }, data: { emailVerified: true } });
          await logActivity("account.claimed", `Adresse confirmée par Google : ${user.email} (mot de passe non confirmé retiré)`, { userId: user.id }, `compte:${user.id}`);
          await welcome(user);
        },
      },
    },
  },
  // The journal: every customer sign-in, by e-mail or Google, and the failed ones.
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const email = ctx.path === "/sign-in/email";
      const social = ctx.path.startsWith("/callback/");
      if (!email && !social) return;
      const how = social ? " avec Google" : "";
      const s = ctx.context.newSession;
      if (s) {
        await logActivity("account.signin", `Connexion${how} : ${s.user.name || s.user.email}`, { userId: s.user.id, via: social ? "google" : "email" }, `compte:${s.user.id}`);
      } else {
        const who = email && typeof ctx.body?.email === "string" ? ` (${ctx.body.email.slice(0, 120)})` : "";
        const why = typeof ctx.query?.error === "string" ? ` : ${ctx.query.error.slice(0, 120)}` : "";
        await logActivity("account.signin_failed", `Connexion${how} échouée${who}${why}`, { via: social ? "google" : "email" }, "inconnu");
      }
    }),
  },
  plugins: [nextCookies()], // lets server actions set the session cookie
});
