/** The production domain (www: artsyde.store redirects to it). */
const PRODUCTION_URL = "https://www.artsyde.store";

/** True on the live Vercel deployment (not on previews or in local development). */
const IS_PRODUCTION = process.env.VERCEL_ENV === "production";

/**
 * Public address of the site, without a trailing slash: SITE_URL, else the production domain on the live
 * deployment, else BETTER_AUTH_URL, else localhost. Used for the sitemap, robots.txt and absolute links.
 */
export const SITE_URL = (
  process.env.SITE_URL || (IS_PRODUCTION ? PRODUCTION_URL : process.env.BETTER_AUTH_URL) || "http://localhost:3000"
).replace(/\/+$/, "");

/**
 * Search engines may index the site: SITE_INDEXING "true"/"false" when set, else only on the live deployment
 * (previews and local development stay out of Google).
 */
export const SITE_INDEXING = process.env.SITE_INDEXING ? process.env.SITE_INDEXING === "true" : IS_PRODUCTION;
