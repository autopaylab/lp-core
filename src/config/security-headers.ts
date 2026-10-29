import { type EnvVars, isIndexable } from "./site-config";

/** Defaults for the two third-party origins every Autopay landing page talks to. */
export const DEFAULT_CONSENT_MANAGER_HOST = "c.delivery.consentmanager.net";
export const DEFAULT_CONSENT_MANAGER_CDN = "cdn.consentmanager.net";
export const DEFAULT_MATOMO_ORIGIN = "https://piwik.blue.pl";

export interface SecurityHeadersOptions {
  /** Defaults to process.env. Tests pass their own map. */
  env?: EnvVars;
  /**
   * Chrome origin-trial token for WebMCP (a public per-origin value, not a
   * secret). Only sent when set. Leave out unless the page registers WebMCP
   * tools and the API is still behind Chrome's origin trial.
   */
  originTrialToken?: string;
}

export interface HttpHeader {
  key: string;
  value: string;
}

interface ThirdPartyOrigins {
  consentManagerDelivery: string;
  consentManagerCdn: string;
  matomoOrigin: string;
}

function assertHttpsOrigin(name: string, value: string): string {
  if (!/^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(value)) {
    throw new Error(`[lp-core] ${name} must be an https origin without a path, got ${JSON.stringify(value)}.`);
  }
  return value;
}

function assertHostname(name: string, value: string): string {
  if (!/^[a-z0-9.-]+$/i.test(value)) {
    throw new Error(`[lp-core] ${name} must be a bare hostname, got ${JSON.stringify(value)}.`);
  }
  return value;
}

/**
 * Third-party origins come from env vars because every landing page has its
 * own ConsentManager config and its own Matomo site. They are validated
 * here, at the boundary, so a typo fails the build instead of silently
 * producing a CSP that blocks the consent banner in production.
 */
export function readThirdPartyOrigins(env: EnvVars = process.env): ThirdPartyOrigins {
  const cmpHost = assertHostname("NEXT_PUBLIC_CMP_HOST", env.NEXT_PUBLIC_CMP_HOST || DEFAULT_CONSENT_MANAGER_HOST);
  const cmpCdn = assertHostname("NEXT_PUBLIC_CMP_CDN", env.NEXT_PUBLIC_CMP_CDN || DEFAULT_CONSENT_MANAGER_CDN);
  const matomoOrigin = assertHttpsOrigin("NEXT_PUBLIC_MATOMO_ORIGIN", env.NEXT_PUBLIC_MATOMO_ORIGIN || DEFAULT_MATOMO_ORIGIN);
  return {
    consentManagerDelivery: `https://${cmpHost}`,
    consentManagerCdn: `https://${cmpCdn}`,
    matomoOrigin,
  };
}

/**
 * Content Security Policy shared by every landing page. Only ConsentManager
 * and Matomo are allowed as third parties; adding another origin is a change
 * to this package, not to a landing page, so the list stays reviewable in
 * one place.
 *
 * 'unsafe-inline' for scripts, not hash/nonce-based: Next.js App Router's
 * RSC hydration payload ships as inline self.__next_f.push(...) scripts with
 * per-build/per-route content that can't be hashed statically, and the
 * instant any hash-source is present in this directive, browsers stop
 * honoring 'unsafe-inline' for the whole thing, breaking hydration. A nonce
 * would cover __next_f too, but requires dynamic (per-request) rendering
 * everywhere, trading away static generation and edge caching for the whole
 * site. Not worth it by default; revisit only if a page genuinely needs it.
 */
export function buildContentSecurityPolicy(env: EnvVars = process.env): string {
  const origins = readThirdPartyOrigins(env);
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${origins.consentManagerCdn} ${origins.consentManagerDelivery} ${origins.matomoOrigin}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${origins.consentManagerCdn} ${origins.consentManagerDelivery} ${origins.matomoOrigin}`,
    `frame-src 'self' ${origins.consentManagerCdn}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join("; ");
}

/**
 * The full set of hardening headers for `next.config.ts`:
 *
 *   async headers() {
 *     return [{ source: "/:path*", headers: createSecurityHeaders() }];
 *   }
 *
 * Evaluated at build time: changing SITE_IS_PUBLIC or any NEXT_PUBLIC_* value
 * needs a redeploy (Vercel applies env changes only to new deployments).
 */
export function createSecurityHeaders(options: SecurityHeadersOptions = {}): HttpHeader[] {
  const env = options.env ?? process.env;
  const headers: HttpHeader[] = [
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy(env) },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    // includeSubDomains + preload are safe defaults IF every subdomain under
    // the domain serves valid HTTPS. Don't submit a domain to hstspreload.org
    // before checking that, and never the apex domain until you've confirmed
    // it isn't a platform-level redirect that bypasses this app's headers
    // entirely (autopaylab.com hit exactly that).
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    // same-origin (not same-origin-allow-popups): fine as long as the page
    // doesn't open or rely on cross-origin popups (no OAuth-style
    // window.opener flows). Loosen it in this package if one is ever needed.
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
  if (!isIndexable(env)) {
    headers.push({ key: "X-Robots-Tag", value: "noindex, nofollow" });
  }
  if (options.originTrialToken) {
    headers.push({ key: "Origin-Trial", value: options.originTrialToken });
  }
  return headers;
}
