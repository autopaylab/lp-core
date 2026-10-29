import { E as EnvVars } from '../site-config-CegvYjda.js';
export { i as isIndexable, a as isSitePublic } from '../site-config-CegvYjda.js';

/** Defaults for the two third-party origins every Autopay landing page talks to. */
declare const DEFAULT_CONSENT_MANAGER_HOST = "c.delivery.consentmanager.net";
declare const DEFAULT_CONSENT_MANAGER_CDN = "cdn.consentmanager.net";
declare const DEFAULT_MATOMO_ORIGIN = "https://piwik.blue.pl";
interface SecurityHeadersOptions {
    /** Defaults to process.env. Tests pass their own map. */
    env?: EnvVars;
    /**
     * Chrome origin-trial token for WebMCP (a public per-origin value, not a
     * secret). Only sent when set. Leave out unless the page registers WebMCP
     * tools and the API is still behind Chrome's origin trial.
     */
    originTrialToken?: string;
}
interface HttpHeader {
    key: string;
    value: string;
}
interface ThirdPartyOrigins {
    consentManagerDelivery: string;
    consentManagerCdn: string;
    matomoOrigin: string;
}
/**
 * Third-party origins come from env vars because every landing page has its
 * own ConsentManager config and its own Matomo site. They are validated
 * here, at the boundary, so a typo fails the build instead of silently
 * producing a CSP that blocks the consent banner in production.
 */
declare function readThirdPartyOrigins(env?: EnvVars): ThirdPartyOrigins;
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
declare function buildContentSecurityPolicy(env?: EnvVars): string;
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
declare function createSecurityHeaders(options?: SecurityHeadersOptions): HttpHeader[];

export { DEFAULT_CONSENT_MANAGER_CDN, DEFAULT_CONSENT_MANAGER_HOST, DEFAULT_MATOMO_ORIGIN, EnvVars, type HttpHeader, type SecurityHeadersOptions, buildContentSecurityPolicy, createSecurityHeaders, readThirdPartyOrigins };
