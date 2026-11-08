import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { createAuthMiddleware } from "better-auth/api";
import { after } from "next/server";
import { db } from "@/server/db";
import { sendEmail } from "@/server/email/send";
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
export async function linkCustomer(user: { id: string; name: string; email: string }) {
  const email = user.email.toLowerCase();
  await db.$transaction(async (tx) => {
    const sameEmail = await tx.customer.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true, userId: true } });
    const customer =
      sameEmail && !sameEmail.userId
        ? await tx.customer.update({ where: { id: sameEmail.id }, data: { userId: user.id }, select: { id: true } })
        : // (An e-mail already held by another account's customer stays with it: the new customer has none.)
          await tx.customer.create({ data: { name: user.name || email.split("@")[0], email: sameEmail ? undefined : email, userId: user.id }, select: { id: true } });
    const bonus = await tx.creditEntry.findFirst({ where: { customerId: customer.id, reason: "SIGNUP_BONUS" }, select: { id: true } });
    if (!bonus) await tx.creditEntry.create({ data: { customerId: customer.id, amount: SIGNUP_CREDITS, reason: "SIGNUP_BONUS" } });
  });
}

/**
 * Customer accounts (Better Auth): Google, or e-mail and password. Tables User, Session, Account and
 * Verification (prisma/schema.prisma); routes under /api/auth (src/app/api/auth/[...all]/route.ts).
 * Needs BETTER_AUTH_SECRET, and GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET for Google (see .env.example).
 */
export const auth = betterAuth({
  // The live site always uses its real domain (a BETTER_AUTH_URL left at localhost would send Google back
  // to http://localhost:3000/api/auth/callback/google). Elsewhere: BETTER_AUTH_URL, or the request's address.
  baseURL: IS_PRODUCTION ? SITE_URL : process.env.BETTER_AUTH_URL || undefined,
  // artsyde.store redirects to www, but both are accepted as origins.
  trustedOrigins: IS_PRODUCTION ? [SITE_URL, SITE_URL.replace("://www.", "://")] : undefined,
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, minPasswordLength: 8, autoSignIn: true },
  socialProviders: google,
  // Someone who signed up with e-mail and later uses Google with the same address gets one account.
  account: { accountLinking: { enabled: true, trustedProviders: ["google"] } },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            await linkCustomer(user);
            await logActivity("account.created", `Nouveau compte : ${user.name || user.email} (${user.email})`, { userId: user.id }, `compte:${user.id}`);
          } catch (e) {
            await logError("linkCustomer", e, { userId: user.id }); // the account works; the customer is linked on the next visit
          }
          // The welcome e-mail, sent after the response so sign-up isn't slowed down (skipped until Brevo is set up).
          const send = async () => sendEmail(welcomeEmail({ name: user.name, email: user.email, credits: SIGNUP_CREDITS, image: await emailImage(), texts: await welcomeTexts(), ad: await emailAd() }));
          try {
            after(send);
          } catch {
            void send(); // outside a request (scripts): send right away
          }
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
