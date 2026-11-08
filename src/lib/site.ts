/**
 * Public address of the site, without a trailing slash: SITE_URL, else BETTER_AUTH_URL, else localhost.
 * Used for canonical links, the sitemap and robots.txt.
 */
export const SITE_URL = (process.env.SITE_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000").replace(/\/+$/, "");

/** Search engines may index the site only when SITE_INDEXING is "true" (keep it off on test deployments). */
export const SITE_INDEXING = process.env.SITE_INDEXING === "true";
