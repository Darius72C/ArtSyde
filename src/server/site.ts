import "server-only";
import { SITE_URL } from "@/lib/site";

/** The site's public address (src/lib/site.ts), for links that leave the site: e-mails, payment returns, webhooks. */
export const siteUrl = () => SITE_URL;
