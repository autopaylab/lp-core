/** Plain env map, so tests can pass only the variables they care about. */
type EnvVars = Record<string, string | undefined>;
/**
 * Launch switch. Until SITE_IS_PUBLIC is exactly "true", a landing page that
 * uses the launch gate (see createLaunchGate) sits behind Basic Auth and is
 * marked noindex everywhere (X-Robots-Tag, robots.txt, <meta name="robots">).
 * One variable flips both, so a page can never be indexable while it is
 * still password-protected, or public while it is still marked noindex.
 */
declare function isSitePublic(env?: EnvVars): boolean;
/**
 * Preview and development deployments stay noindex even after launch, so
 * Vercel preview URLs never compete with the production domain in search.
 * VERCEL_ENV is unset outside Vercel (local `next start`), which counts as
 * production so the launch state can be checked locally.
 */
declare function isIndexable(env?: EnvVars): boolean;

export { type EnvVars as E, isSitePublic as a, isIndexable as i };
