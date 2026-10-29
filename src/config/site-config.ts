/** Plain env map, so tests can pass only the variables they care about. */
export type EnvVars = Record<string, string | undefined>;

/**
 * Launch switch. Until SITE_IS_PUBLIC is exactly "true", a landing page that
 * uses the launch gate (see createLaunchGate) sits behind Basic Auth and is
 * marked noindex everywhere (X-Robots-Tag, robots.txt, <meta name="robots">).
 * One variable flips both, so a page can never be indexable while it is
 * still password-protected, or public while it is still marked noindex.
 */
export function isSitePublic(env: EnvVars = process.env): boolean {
  return env.SITE_IS_PUBLIC === "true";
}

/**
 * Preview and development deployments stay noindex even after launch, so
 * Vercel preview URLs never compete with the production domain in search.
 * VERCEL_ENV is unset outside Vercel (local `next start`), which counts as
 * production so the launch state can be checked locally.
 */
export function isIndexable(env: EnvVars = process.env): boolean {
  const isProductionDeployment = env.VERCEL_ENV === undefined || env.VERCEL_ENV === "production";
  return isSitePublic(env) && isProductionDeployment;
}
