import type { MetadataRoute } from "next";

import { type EnvVars, isIndexable } from "../config/site-config";

export interface RobotsOptions {
  /** Absolute production URL, e.g. https://paytalk.pl, used for the sitemap link. */
  siteUrl: string;
  /** Defaults to process.env. */
  env?: EnvVars;
}

/**
 * robots.txt for `src/app/robots.ts`:
 *
 *   export default function robots() { return createRobots({ siteUrl: SITE_URL }); }
 *
 * Disallows everything until the site is public (and on every preview).
 */
export function createRobots(options: RobotsOptions): MetadataRoute.Robots {
  if (!isIndexable(options.env ?? process.env)) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${options.siteUrl.replace(/\/$/, "")}/sitemap.xml`,
  };
}
