import "server-only";

/** The site's public address (BETTER_AUTH_URL), for links that leave the site: e-mails, payment returns, webhooks. */
export const siteUrl = () => (process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
